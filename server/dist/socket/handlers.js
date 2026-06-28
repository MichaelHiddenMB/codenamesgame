"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const auth_1 = require("../middleware/auth");
const engine_1 = require("../game/engine");
const db_1 = require("../db");
const lobbies = new Map();
const games = new Map();
const socketToRoom = new Map(); // socketId → roomCode
const disconnectTimers = new Map(); // `${userId}:${code}` → removal timer
// Players who explicitly left mid-game; keyed by `${userId}:${code}` so they can rejoin
const pastPlayers = new Map();
// Spectator slots available per game — frozen at game-start so mid-game departures
// don't open slots for strangers. keyed by room code.
const gameSpectatorSlots = new Map();
// Per-room hover state: roomCode → Map<userId, Set<cardIndex>>
const cardHovers = new Map();
function broadcastHovers(io, code, lobby) {
    const roomHovers = cardHovers.get(code);
    if (!roomHovers) {
        io.to(code).emit('game:hovers', []);
        return;
    }
    const hovers = Array.from(roomHovers.entries())
        .filter(([, indices]) => indices.size > 0)
        .map(([userId, indices]) => {
        const player = lobby.players.find(p => p.userId === userId);
        return player ? { userId, username: player.username, cardIndices: Array.from(indices) } : null;
    }).filter(Boolean);
    io.to(code).emit('game:hovers', hovers);
}
function clearHovers(io, code, lobby) {
    const roomHovers = cardHovers.get(code);
    if (roomHovers)
        roomHovers.clear();
    io.to(code).emit('game:hovers', []);
}
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
function getTimerSeconds(timer) {
    if (timer === 'off')
        return null;
    return parseInt(timer, 10);
}
function lobbyPublic(lobby) {
    return {
        code: lobby.code,
        hostUserId: lobby.hostUserId,
        settings: lobby.settings,
        players: lobby.players.map(p => ({
            userId: p.userId,
            username: p.username,
            equippedAvatarId: p.equippedAvatarId,
            coins: p.coins,
            team: p.team,
            role: p.role,
        })),
        status: lobby.status,
    };
}
function gamePublicForPlayer(state, role) {
    return {
        roomCode: state.roomCode,
        board: (role === 'spymaster' || state.winner !== null) ? state.board : (0, engine_1.redactBoardForOperative)(state.board),
        currentTurn: state.currentTurn,
        phase: state.phase,
        activeClue: state.activeClue,
        guessesUsed: state.guessesUsed,
        rustRemaining: state.rustRemaining,
        tealRemaining: state.tealRemaining,
        winner: state.winner,
        round: state.round,
        timerEndsAt: state.timerEndsAt,
        avoidPenaltyTeam: state.avoidPenaltyTeam,
        powerUpsEnabled: state.powerUpsEnabled,
        doubleClueTeam: state.doubleClueTeam,
        clueHistory: state.clueHistory,
    };
}
function broadcastLobby(io, code) {
    const lobby = lobbies.get(code);
    if (!lobby)
        return;
    io.to(code).emit('lobby:update', lobbyPublic(lobby));
}
function broadcastGame(io, code) {
    const lobby = lobbies.get(code);
    const game = games.get(code);
    if (!lobby || !game)
        return;
    for (const player of lobby.players) {
        const sock = io.sockets.sockets.get(player.socketId);
        if (sock) {
            sock.emit('game:update', gamePublicForPlayer(game, player.role));
        }
    }
}
function isReadyToStart(lobby) {
    const rust = lobby.players.filter(p => p.team === 'rust');
    const teal = lobby.players.filter(p => p.team === 'teal');
    if (rust.length === 0 || teal.length === 0)
        return { ok: false, reason: 'Both teams need at least one player' };
    if (!rust.some(p => p.role === 'spymaster'))
        return { ok: false, reason: 'Rust team needs a spymaster' };
    if (!teal.some(p => p.role === 'spymaster'))
        return { ok: false, reason: 'Teal team needs a spymaster' };
    if (rust.filter(p => p.role === 'operative').length === 0)
        return { ok: false, reason: 'Rust team needs at least one operative' };
    if (teal.filter(p => p.role === 'operative').length === 0)
        return { ok: false, reason: 'Teal team needs at least one operative' };
    return { ok: true };
}
// ─── SERVER-SIDE TIMER ENFORCEMENT ───────────────────────────────────────────
// Fires when the guessing-phase clock expires. Skips if the game has already
// moved on (different timerEndsAt or not in guessing phase anymore).
function scheduleTimer(io, code, endsAt) {
    const delay = Math.max(0, endsAt - Date.now());
    setTimeout(() => {
        const game = games.get(code);
        const lobby = lobbies.get(code);
        if (!game || !lobby)
            return;
        if (game.phase !== 'guessing')
            return; // giving-clue timeout: skip
        if (game.timerEndsAt !== endsAt)
            return; // timer was superseded: skip
        const timerSec = getTimerSeconds(lobby.settings.timer);
        const next = (0, engine_1.applyEndTurn)(game, timerSec);
        games.set(code, next);
        clearHovers(io, code, lobby);
        broadcastGame(io, code);
        if (next.timerEndsAt)
            scheduleTimer(io, code, next.timerEndsAt);
    }, delay + 150); // 150 ms grace for last-second guesses
}
function registerSocketHandlers(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        const payload = (0, auth_1.verifyToken)(token);
        if (!payload)
            return next(new Error('Unauthorized'));
        socket.user = payload;
        next();
    });
    io.on('connection', (socket) => {
        const user = socket.user;
        // ─── AUTO-RECONNECT ──────────────────────────────────────────────────────
        // If this user already has a slot in a lobby (from a prior connection),
        // restore it without requiring them to re-join manually.
        for (const [code, lobby] of lobbies) {
            const player = lobby.players.find(p => p.userId === user.userId);
            if (!player)
                continue;
            const timerKey = `${user.userId}:${code}`;
            const pending = disconnectTimers.get(timerKey);
            if (pending) {
                clearTimeout(pending);
                disconnectTimers.delete(timerKey);
            }
            // Remap socket
            socketToRoom.delete(player.socketId);
            player.socketId = socket.id;
            socketToRoom.set(socket.id, code);
            socket.join(code);
            // Send current state to the reconnected client
            socket.emit('lobby:joined', { code, lobby: lobbyPublic(lobby) });
            const game = games.get(code);
            if (game)
                socket.emit('game:update', gamePublicForPlayer(game, player.role));
            broadcastLobby(io, code);
            break; // a user can only be in one lobby
        }
        function getUserInfo() {
            const row = db_1.db.getUserById(user.userId);
            return { userId: user.userId, username: user.username, equippedAvatarId: row?.equipped_avatar_id ?? 0, coins: row?.coins ?? 0 };
        }
        // ─── LOBBY: CREATE ───────────────────────────────────────────────────────
        socket.on('lobby:create', (settings) => {
            let code = generateCode();
            while (lobbies.has(code))
                code = generateCode();
            const info = getUserInfo();
            const player = { ...info, team: 'rust', role: 'spymaster', socketId: socket.id };
            const lobby = {
                code,
                hostUserId: user.userId,
                settings: { mode: settings.mode ?? 'CLASSIC', timer: settings.timer ?? '60', maxPlayers: settings.maxPlayers ?? 8, powerUps: settings.powerUps ?? false },
                players: [player],
                status: 'waiting',
            };
            lobbies.set(code, lobby);
            socketToRoom.set(socket.id, code);
            socket.join(code);
            socket.emit('lobby:created', { code, lobby: lobbyPublic(lobby) });
        });
        // ─── LOBBY: JOIN ─────────────────────────────────────────────────────────
        socket.on('lobby:join', (code) => {
            const upper = code.toUpperCase();
            const lobby = lobbies.get(upper);
            if (!lobby) {
                socket.emit('lobby:error', 'No lobby with that code');
                return;
            }
            if (lobby.status === 'in-game') {
                // ── Join an in-progress game ──────────────────────────────────────────
                const pastKey = `${user.userId}:${upper}`;
                const past = pastPlayers.get(pastKey);
                // Already in the lobby (e.g. re-triggered join)?
                const current = lobby.players.find(p => p.userId === user.userId);
                if (current) {
                    current.socketId = socket.id;
                    socketToRoom.set(socket.id, upper);
                    socket.join(upper);
                    socket.emit('lobby:joined', { code: upper, lobby: lobbyPublic(lobby) });
                    const game = games.get(upper);
                    if (game)
                        socket.emit('game:update', gamePublicForPlayer(game, current.role));
                    return;
                }
                // New spectators are blocked based on the slot count frozen at game start.
                // This prevents mid-game departures from opening slots for strangers.
                // Past players (rejoiners) always bypass this — they already held a slot.
                if (!past) {
                    const allowedSpectators = gameSpectatorSlots.get(upper) ?? 0;
                    const currentSpectators = lobby.players.filter(p => p.role === 'spectator').length;
                    if (currentSpectators >= allowedSpectators) {
                        socket.emit('lobby:error', 'Lobby is full');
                        return;
                    }
                }
                const info = getUserInfo();
                const role = past ? past.role : 'spectator';
                const team = past ? past.team : null;
                if (past)
                    pastPlayers.delete(pastKey);
                const player = { ...info, team, role, socketId: socket.id };
                lobby.players.push(player);
                socketToRoom.set(socket.id, upper);
                socket.join(upper);
                socket.emit('lobby:joined', { code: upper, lobby: lobbyPublic(lobby) });
                const game = games.get(upper);
                if (game)
                    socket.emit('game:update', gamePublicForPlayer(game, role));
                broadcastLobby(io, upper);
                return;
            }
            // ── Join a waiting lobby ─────────────────────────────────────────────────
            if (lobby.players.length >= lobby.settings.maxPlayers) {
                socket.emit('lobby:error', 'Lobby is full');
                return;
            }
            const existing = lobby.players.findIndex(p => p.userId === user.userId);
            if (existing !== -1) {
                lobby.players[existing].socketId = socket.id;
            }
            else {
                const info = getUserInfo();
                const team = lobby.players.filter(p => p.team === 'rust').length <=
                    lobby.players.filter(p => p.team === 'teal').length ? 'rust' : 'teal';
                lobby.players.push({ ...info, team, role: 'operative', socketId: socket.id });
            }
            socketToRoom.set(socket.id, upper);
            socket.join(upper);
            socket.emit('lobby:joined', { code: upper, lobby: lobbyPublic(lobby) });
            broadcastLobby(io, upper);
        });
        // ─── LOBBY: SWITCH TEAM ──────────────────────────────────────────────────
        socket.on('lobby:team', (team) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            player.team = team;
            player.role = 'operative';
            broadcastLobby(io, code);
        });
        // ─── LOBBY: SET SPYMASTER ────────────────────────────────────────────────
        socket.on('lobby:spymaster', (targetUserId) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            const target = lobby.players.find(p => p.userId === targetUserId);
            if (!target)
                return;
            // Demote current spymaster on that team
            for (const p of lobby.players) {
                if (p.team === target.team && p.role === 'spymaster')
                    p.role = 'operative';
            }
            target.role = 'spymaster';
            broadcastLobby(io, code);
        });
        // ─── LOBBY: START ────────────────────────────────────────────────────────
        socket.on('lobby:start', () => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            if (lobby.hostUserId !== user.userId) {
                socket.emit('lobby:error', 'Only the host can start');
                return;
            }
            const { ok, reason } = isReadyToStart(lobby);
            if (!ok) {
                socket.emit('lobby:error', reason);
                return;
            }
            lobby.status = 'in-game';
            // Freeze spectator capacity: slots not occupied by active players at start
            const activePlayers = lobby.players.filter(p => p.role !== 'spectator').length;
            gameSpectatorSlots.set(code, Math.max(0, lobby.settings.maxPlayers - activePlayers));
            const firstTeam = Math.random() < 0.5 ? 'rust' : 'teal';
            const board = (0, engine_1.generateBoard)(lobby.settings.mode, firstTeam);
            const timerSec = getTimerSeconds(lobby.settings.timer);
            const game = {
                roomCode: code,
                mode: lobby.settings.mode,
                board,
                currentTurn: firstTeam,
                phase: 'giving-clue',
                activeClue: null,
                guessesUsed: 0,
                rustRemaining: (0, engine_1.countRemaining)(board, 'rust'),
                tealRemaining: (0, engine_1.countRemaining)(board, 'teal'),
                winner: null,
                round: 1,
                timerEndsAt: timerSec ? Date.now() + timerSec * 1000 : null,
                avoidPenaltyTeam: null,
                powerUpsEnabled: lobby.settings.powerUps,
                doubleClueTeam: null,
                clueHistory: [],
            };
            games.set(code, game);
            broadcastLobby(io, code);
            broadcastGame(io, code);
            if (game.timerEndsAt)
                scheduleTimer(io, code, game.timerEndsAt);
        });
        // ─── GAME: CLUE ──────────────────────────────────────────────────────────
        socket.on('game:clue', ({ word, number: num, word2 }) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const game = games.get(code);
            const lobby = lobbies.get(code);
            if (!game || !lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player || player.role !== 'spymaster' || player.team !== game.currentTurn)
                return;
            if (game.phase !== 'giving-clue')
                return;
            if (!word || /\s/.test(word.trim()))
                return;
            const validWord2 = (word2 && !(/\s/.test(word2.trim())) && game.doubleClueTeam === player.team)
                ? word2.trim() : undefined;
            const timerSec = getTimerSeconds(lobby.settings.timer);
            const afterClue = (0, engine_1.applyClue)(game, word, num, timerSec, validWord2);
            games.set(code, afterClue);
            broadcastGame(io, code);
            if (afterClue.timerEndsAt)
                scheduleTimer(io, code, afterClue.timerEndsAt);
        });
        // ─── GAME: POWER-UP ──────────────────────────────────────────────────────
        socket.on('game:powerup', ({ type }) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const game = games.get(code);
            const lobby = lobbies.get(code);
            if (!game || !lobby)
                return;
            if (!game.powerUpsEnabled || game.phase === 'over')
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player || player.role === 'spectator' || !player.team)
                return;
            const validTypes = ['REVEAL_FRIENDLY', 'STEAL_NEUTRAL', 'DOUBLE_CLUE', 'REVEAL_NEUTRAL', 'REMOVE_AVOID', 'REROLL_BOARD'];
            if (!validTypes.includes(type))
                return;
            const price = engine_1.POWER_UP_PRICES[type];
            const dbUser = db_1.db.getUserById(player.userId);
            if (!dbUser || dbUser.coins < price) {
                socket.emit('lobby:error', 'Not enough coins');
                return;
            }
            const newCoins = db_1.db.deductCoins(player.userId, price);
            player.coins = newCoins;
            const newGame = (0, engine_1.applyPowerUp)(game, type, player.team);
            games.set(code, newGame);
            if (newGame.winner) {
                const winnerPlayers = lobby.players.filter(p => p.team === newGame.winner);
                for (const wp of winnerPlayers) {
                    try {
                        wp.coins = db_1.db.addCoins(wp.userId, 50);
                    }
                    catch { /* ignore */ }
                }
            }
            broadcastLobby(io, code);
            broadcastGame(io, code);
            socket.emit('user:coins', newCoins);
        });
        // ─── GAME: GUESS ─────────────────────────────────────────────────────────
        socket.on('game:guess', (cardIndex) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const game = games.get(code);
            const lobby = lobbies.get(code);
            if (!game || !lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player || player.role !== 'operative' || player.team !== game.currentTurn)
                return;
            if (game.phase !== 'guessing')
                return;
            const timerSec = getTimerSeconds(lobby.settings.timer);
            const { newState } = (0, engine_1.applyGuess)(game, cardIndex, timerSec);
            games.set(code, newState);
            if (newState.winner) {
                const winnerPlayers = lobby.players.filter(p => p.team === newState.winner);
                for (const wp of winnerPlayers) {
                    try {
                        wp.coins = db_1.db.addCoins(wp.userId, 50);
                    }
                    catch { /* ignore if user disconnected */ }
                }
                broadcastLobby(io, code);
            }
            clearHovers(io, code, lobby);
            broadcastGame(io, code);
            // Schedule timer only when timerEndsAt was reset (turn changed)
            if (newState.timerEndsAt && newState.timerEndsAt !== game.timerEndsAt) {
                scheduleTimer(io, code, newState.timerEndsAt);
            }
        });
        // ─── GAME: END TURN ──────────────────────────────────────────────────────
        socket.on('game:end-turn', () => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const game = games.get(code);
            const lobby = lobbies.get(code);
            if (!game || !lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player || player.team !== game.currentTurn || player.role === 'spymaster')
                return;
            if (game.phase !== 'guessing')
                return;
            const timerSec = getTimerSeconds(lobby.settings.timer);
            const afterEndTurn = (0, engine_1.applyEndTurn)(game, timerSec);
            games.set(code, afterEndTurn);
            clearHovers(io, code, lobby);
            broadcastGame(io, code);
            if (afterEndTurn.timerEndsAt)
                scheduleTimer(io, code, afterEndTurn.timerEndsAt);
        });
        // ─── GAME: HOVER ─────────────────────────────────────────────────────────
        socket.on('game:hover', ({ indices }) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            if (!cardHovers.has(code))
                cardHovers.set(code, new Map());
            const roomHovers = cardHovers.get(code);
            if (indices.length === 0)
                roomHovers.delete(player.userId);
            else
                roomHovers.set(player.userId, new Set(indices));
            broadcastHovers(io, code, lobby);
        });
        // ─── GAME: RETURN TO LOBBY ───────────────────────────────────────────────
        socket.on('game:return-lobby', () => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby || lobby.status !== 'in-game')
                return;
            const game = games.get(code);
            if (!game?.winner)
                return; // only allowed once game has ended
            games.delete(code);
            gameSpectatorSlots.delete(code);
            cardHovers.delete(code);
            lobby.status = 'waiting';
            // Remove spectators and clear past-player records
            lobby.players = lobby.players.filter(p => p.role !== 'spectator');
            for (const key of pastPlayers.keys()) {
                if (key.endsWith(`:${code}`))
                    pastPlayers.delete(key);
            }
            io.to(code).emit('lobby:returned', lobbyPublic(lobby));
        });
        // ─── LOBBY: TRANSFER HOST ────────────────────────────────────────────────
        socket.on('lobby:transfer-host', (targetUserId) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby || lobby.status !== 'waiting')
                return;
            if (lobby.hostUserId !== user.userId)
                return;
            const target = lobby.players.find(p => p.userId === targetUserId);
            if (!target)
                return;
            lobby.hostUserId = targetUserId;
            broadcastLobby(io, code);
        });
        // ─── LOBBY: RANDOMIZE TEAMS ──────────────────────────────────────────────
        socket.on('lobby:randomize', () => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby || lobby.status !== 'waiting')
                return;
            if (lobby.hostUserId !== user.userId)
                return;
            const active = lobby.players.filter(p => p.role !== 'spectator');
            if (active.length < 2)
                return;
            // Fisher-Yates shuffle
            for (let i = active.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [active[i], active[j]] = [active[j], active[i]];
            }
            const rustCount = Math.floor(active.length / 2);
            active.forEach((p, i) => {
                const player = lobby.players.find(lp => lp.userId === p.userId);
                player.team = i < rustCount ? 'rust' : 'teal';
                player.role = 'operative';
            });
            // Pick one spymaster per team at random (first after shuffle)
            const rustPlayers = lobby.players.filter(p => p.team === 'rust');
            const tealPlayers = lobby.players.filter(p => p.team === 'teal');
            if (rustPlayers.length > 0)
                rustPlayers[0].role = 'spymaster';
            if (tealPlayers.length > 0)
                tealPlayers[0].role = 'spymaster';
            broadcastLobby(io, code);
        });
        // ─── LOBBY: BECOME SPECTATOR ─────────────────────────────────────────────
        socket.on('lobby:spectate', () => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby || lobby.status !== 'waiting')
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            player.role = 'spectator';
            player.team = null;
            broadcastLobby(io, code);
        });
        // ─── PLAYER: UPDATE AVATAR ───────────────────────────────────────────────
        socket.on('player:avatar', (avatarId) => {
            const code = socketToRoom.get(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            player.equippedAvatarId = avatarId;
            broadcastLobby(io, code);
        });
        // ─── LEAVE (explicit) ────────────────────────────────────────────────────
        socket.on('lobby:leave', () => handleLeave(socket, io));
        // ─── DISCONNECT (network / tab close) ────────────────────────────────────
        // Keep the player's slot alive for 60 s so they can reconnect seamlessly.
        socket.on('disconnect', () => {
            const code = socketToRoom.get(socket.id);
            socketToRoom.delete(socket.id);
            if (!code)
                return;
            const lobby = lobbies.get(code);
            if (!lobby)
                return;
            const player = lobby.players.find(p => p.socketId === socket.id);
            if (!player)
                return;
            // Schedule removal after grace period
            const timerKey = `${player.userId}:${code}`;
            const timer = setTimeout(() => {
                disconnectTimers.delete(timerKey);
                const l = lobbies.get(code);
                if (!l)
                    return;
                cardHovers.get(code)?.delete(player.userId);
                l.players = l.players.filter(p => p.userId !== player.userId);
                if (l.players.length === 0) {
                    lobbies.delete(code);
                    games.delete(code);
                    cardHovers.delete(code);
                    return;
                }
                if (!l.players.some(p => p.userId === l.hostUserId))
                    l.hostUserId = l.players[0].userId;
                broadcastLobby(io, code);
            }, 60000);
            disconnectTimers.set(timerKey, timer);
            // No broadcastLobby — others keep seeing them in the list during grace period
        });
    });
}
function handleLeave(socket, io) {
    const code = socketToRoom.get(socket.id);
    if (!code)
        return;
    socketToRoom.delete(socket.id);
    const lobby = lobbies.get(code);
    if (!lobby)
        return;
    const player = lobby.players.find(p => p.socketId === socket.id);
    if (player) {
        // Clear any hover this player had
        cardHovers.get(code)?.delete(player.userId);
        // Cancel any pending disconnect timer for this player
        const timerKey = `${player.userId}:${code}`;
        const pending = disconnectTimers.get(timerKey);
        if (pending) {
            clearTimeout(pending);
            disconnectTimers.delete(timerKey);
        }
        // Preserve original team/role so they can rejoin mid-game
        if (lobby.status === 'in-game' && player.role !== 'spectator') {
            pastPlayers.set(`${player.userId}:${code}`, { team: player.team, role: player.role });
        }
    }
    lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
    if (lobby.players.length === 0) {
        lobbies.delete(code);
        games.delete(code);
        gameSpectatorSlots.delete(code);
        cardHovers.delete(code);
        return;
    }
    if (!lobby.players.some(p => p.userId === lobby.hostUserId)) {
        lobby.hostUserId = lobby.players[0].userId;
    }
    socket.leave(code);
    broadcastLobby(io, code);
}
