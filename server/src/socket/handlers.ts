import { Server as IOServer, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middleware/auth';
import {
  generateBoard, applyClue, applyGuess, applyEndTurn,
  redactBoardForOperative, countRemaining,
  GameState, Team, GameMode, TimerOption
} from '../game/engine';
import { db } from '../db';

interface Player {
  userId: number;
  username: string;
  equippedAvatarId: number;
  team: Team | null;
  role: 'spymaster' | 'operative' | 'spectator';
  socketId: string;
}

interface LobbyState {
  code: string;
  hostUserId: number;
  settings: { mode: GameMode; timer: TimerOption; maxPlayers: number };
  players: Player[];
  status: 'waiting' | 'in-game';
}

const lobbies = new Map<string, LobbyState>();
const games   = new Map<string, GameState>();
const socketToRoom    = new Map<string, string>();    // socketId → roomCode
const disconnectTimers = new Map<string, NodeJS.Timeout>(); // `${userId}:${code}` → removal timer
// Players who explicitly left mid-game; keyed by `${userId}:${code}` so they can rejoin
const pastPlayers = new Map<string, { team: Team | null; role: 'spymaster' | 'operative' }>();
// Spectator slots available per game — frozen at game-start so mid-game departures
// don't open slots for strangers. keyed by room code.
const gameSpectatorSlots = new Map<string, number>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getTimerSeconds(timer: TimerOption): number | null {
  if (timer === 'off') return null;
  return parseInt(timer, 10);
}

function lobbyPublic(lobby: LobbyState) {
  return {
    code: lobby.code,
    hostUserId: lobby.hostUserId,
    settings: lobby.settings,
    players: lobby.players.map(p => ({
      userId: p.userId,
      username: p.username,
      equippedAvatarId: p.equippedAvatarId,
      team: p.team,
      role: p.role,
    })),
    status: lobby.status,
  };
}

function gamePublicForPlayer(state: GameState, role: 'spymaster' | 'operative' | 'spectator') {
  return {
    roomCode: state.roomCode,
    board: role === 'spymaster' ? state.board : redactBoardForOperative(state.board),
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
  };
}

function broadcastLobby(io: IOServer, code: string) {
  const lobby = lobbies.get(code);
  if (!lobby) return;
  io.to(code).emit('lobby:update', lobbyPublic(lobby));
}

function broadcastGame(io: IOServer, code: string) {
  const lobby = lobbies.get(code);
  const game = games.get(code);
  if (!lobby || !game) return;

  for (const player of lobby.players) {
    const sock = io.sockets.sockets.get(player.socketId);
    if (sock) {
      sock.emit('game:update', gamePublicForPlayer(game, player.role));
    }
  }
}

function isReadyToStart(lobby: LobbyState): { ok: boolean; reason?: string } {
  const rust = lobby.players.filter(p => p.team === 'rust');
  const teal = lobby.players.filter(p => p.team === 'teal');
  if (rust.length === 0 || teal.length === 0) return { ok: false, reason: 'Both teams need at least one player' };
  if (!rust.some(p => p.role === 'spymaster')) return { ok: false, reason: 'Rust team needs a spymaster' };
  if (!teal.some(p => p.role === 'spymaster')) return { ok: false, reason: 'Teal team needs a spymaster' };
  if (rust.filter(p => p.role === 'operative').length === 0) return { ok: false, reason: 'Rust team needs at least one operative' };
  if (teal.filter(p => p.role === 'operative').length === 0) return { ok: false, reason: 'Teal team needs at least one operative' };
  return { ok: true };
}

// ─── SERVER-SIDE TIMER ENFORCEMENT ───────────────────────────────────────────
// Fires when the guessing-phase clock expires. Skips if the game has already
// moved on (different timerEndsAt or not in guessing phase anymore).
function scheduleTimer(io: IOServer, code: string, endsAt: number) {
  const delay = Math.max(0, endsAt - Date.now());
  setTimeout(() => {
    const game = games.get(code);
    const lobby = lobbies.get(code);
    if (!game || !lobby) return;
    if (game.phase !== 'guessing') return;      // giving-clue timeout: skip
    if (game.timerEndsAt !== endsAt) return;    // timer was superseded: skip
    const timerSec = getTimerSeconds(lobby.settings.timer);
    const next = applyEndTurn(game, timerSec);
    games.set(code, next);
    broadcastGame(io, code);
    if (next.timerEndsAt) scheduleTimer(io, code, next.timerEndsAt);
  }, delay + 150); // 150 ms grace for last-second guesses
}

export function registerSocketHandlers(io: IOServer) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    const payload = verifyToken(token);
    if (!payload) return next(new Error('Unauthorized'));
    (socket as any).user = payload;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;

    // ─── AUTO-RECONNECT ──────────────────────────────────────────────────────
    // If this user already has a slot in a lobby (from a prior connection),
    // restore it without requiring them to re-join manually.
    for (const [code, lobby] of lobbies) {
      const player = lobby.players.find(p => p.userId === user.userId);
      if (!player) continue;

      const timerKey = `${user.userId}:${code}`;
      const pending = disconnectTimers.get(timerKey);
      if (pending) { clearTimeout(pending); disconnectTimers.delete(timerKey); }

      // Remap socket
      socketToRoom.delete(player.socketId);
      player.socketId = socket.id;
      socketToRoom.set(socket.id, code);
      socket.join(code);

      // Send current state to the reconnected client
      socket.emit('lobby:joined', { code, lobby: lobbyPublic(lobby) });
      const game = games.get(code);
      if (game) socket.emit('game:update', gamePublicForPlayer(game, player.role));

      broadcastLobby(io, code);
      break; // a user can only be in one lobby
    }

    function getUserInfo(): { userId: number; username: string; equippedAvatarId: number } {
      const row = db.getUserById(user.userId);
      return { userId: user.userId, username: user.username, equippedAvatarId: row?.equipped_avatar_id ?? 1 };
    }

    // ─── LOBBY: CREATE ───────────────────────────────────────────────────────
    socket.on('lobby:create', (settings: { mode: GameMode; timer: TimerOption; maxPlayers: number }) => {
      let code = generateCode();
      while (lobbies.has(code)) code = generateCode();

      const info = getUserInfo();
      const player: Player = { ...info, team: 'rust', role: 'spymaster', socketId: socket.id };
      const lobby: LobbyState = {
        code,
        hostUserId: user.userId,
        settings: { mode: settings.mode ?? 'CLASSIC', timer: settings.timer ?? '60', maxPlayers: settings.maxPlayers ?? 8 },
        players: [player],
        status: 'waiting',
      };
      lobbies.set(code, lobby);
      socketToRoom.set(socket.id, code);
      socket.join(code);
      socket.emit('lobby:created', { code, lobby: lobbyPublic(lobby) });
    });

    // ─── LOBBY: JOIN ─────────────────────────────────────────────────────────
    socket.on('lobby:join', (code: string) => {
      const upper = code.toUpperCase();
      const lobby = lobbies.get(upper);
      if (!lobby) { socket.emit('lobby:error', 'No lobby with that code'); return; }

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
          if (game) socket.emit('game:update', gamePublicForPlayer(game, current.role));
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
        const role = past ? past.role : 'spectator' as const;
        const team = past ? past.team : null;
        if (past) pastPlayers.delete(pastKey);

        const player: Player = { ...info, team, role, socketId: socket.id };
        lobby.players.push(player);
        socketToRoom.set(socket.id, upper);
        socket.join(upper);
        socket.emit('lobby:joined', { code: upper, lobby: lobbyPublic(lobby) });
        const game = games.get(upper);
        if (game) socket.emit('game:update', gamePublicForPlayer(game, role));
        broadcastLobby(io, upper);
        return;
      }

      // ── Join a waiting lobby ─────────────────────────────────────────────────
      if (lobby.players.length >= lobby.settings.maxPlayers) { socket.emit('lobby:error', 'Lobby is full'); return; }

      const existing = lobby.players.findIndex(p => p.userId === user.userId);
      if (existing !== -1) {
        lobby.players[existing].socketId = socket.id;
      } else {
        const info = getUserInfo();
        const team: Team = lobby.players.filter(p => p.team === 'rust').length <=
          lobby.players.filter(p => p.team === 'teal').length ? 'rust' : 'teal';
        lobby.players.push({ ...info, team, role: 'operative', socketId: socket.id });
      }

      socketToRoom.set(socket.id, upper);
      socket.join(upper);
      socket.emit('lobby:joined', { code: upper, lobby: lobbyPublic(lobby) });
      broadcastLobby(io, upper);
    });

    // ─── LOBBY: SWITCH TEAM ──────────────────────────────────────────────────
    socket.on('lobby:team', (team: Team) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player) return;
      player.team = team;
      player.role = 'operative';
      broadcastLobby(io, code);
    });

    // ─── LOBBY: SET SPYMASTER ────────────────────────────────────────────────
    socket.on('lobby:spymaster', (targetUserId: number) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby) return;
      const target = lobby.players.find(p => p.userId === targetUserId);
      if (!target) return;
      // Demote current spymaster on that team
      for (const p of lobby.players) {
        if (p.team === target.team && p.role === 'spymaster') p.role = 'operative';
      }
      target.role = 'spymaster';
      broadcastLobby(io, code);
    });

    // ─── LOBBY: START ────────────────────────────────────────────────────────
    socket.on('lobby:start', () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby) return;
      if (lobby.hostUserId !== user.userId) { socket.emit('lobby:error', 'Only the host can start'); return; }
      const { ok, reason } = isReadyToStart(lobby);
      if (!ok) { socket.emit('lobby:error', reason); return; }

      lobby.status = 'in-game';
      // Freeze spectator capacity: slots not occupied by active players at start
      const activePlayers = lobby.players.filter(p => p.role !== 'spectator').length;
      gameSpectatorSlots.set(code, Math.max(0, lobby.settings.maxPlayers - activePlayers));
      const firstTeam: Team = Math.random() < 0.5 ? 'rust' : 'teal';
      const board = generateBoard(lobby.settings.mode, firstTeam);
      const timerSec = getTimerSeconds(lobby.settings.timer);
      const game: GameState = {
        roomCode: code,
        board,
        currentTurn: firstTeam,
        phase: 'giving-clue',
        activeClue: null,
        guessesUsed: 0,
        rustRemaining: countRemaining(board, 'rust'),
        tealRemaining: countRemaining(board, 'teal'),
        winner: null,
        round: 1,
        timerEndsAt: timerSec ? Date.now() + timerSec * 1000 : null,
        avoidPenaltyTeam: null,
      };
      games.set(code, game);
      broadcastLobby(io, code);
      broadcastGame(io, code);
      if (game.timerEndsAt) scheduleTimer(io, code, game.timerEndsAt);
    });

    // ─── GAME: CLUE ──────────────────────────────────────────────────────────
    socket.on('game:clue', ({ word, number: num }: { word: string; number: number }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const game = games.get(code);
      const lobby = lobbies.get(code);
      if (!game || !lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player || player.role !== 'spymaster' || player.team !== game.currentTurn) return;
      if (game.phase !== 'giving-clue') return;
      const timerSec = getTimerSeconds(lobby.settings.timer);
      const afterClue = applyClue(game, word, num, timerSec);
      games.set(code, afterClue);
      broadcastGame(io, code);
      if (afterClue.timerEndsAt) scheduleTimer(io, code, afterClue.timerEndsAt);
    });

    // ─── GAME: GUESS ─────────────────────────────────────────────────────────
    socket.on('game:guess', (cardIndex: number) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const game = games.get(code);
      const lobby = lobbies.get(code);
      if (!game || !lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player || player.role !== 'operative' || player.team !== game.currentTurn) return;
      if (game.phase !== 'guessing') return;
      const timerSec = getTimerSeconds(lobby.settings.timer);
      const { newState } = applyGuess(game, cardIndex, timerSec);
      games.set(code, newState);
      if (newState.winner) {
        const winnerPlayers = lobby.players.filter(p => p.team === newState.winner);
        for (const wp of winnerPlayers) {
          try { db.addCoins(wp.userId, 50); } catch { /* ignore if user disconnected */ }
        }
      }
      broadcastGame(io, code);
      // Schedule timer only when timerEndsAt was reset (turn changed)
      if (newState.timerEndsAt && newState.timerEndsAt !== game.timerEndsAt) {
        scheduleTimer(io, code, newState.timerEndsAt);
      }
    });

    // ─── GAME: END TURN ──────────────────────────────────────────────────────
    socket.on('game:end-turn', () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const game = games.get(code);
      const lobby = lobbies.get(code);
      if (!game || !lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player || player.team !== game.currentTurn || player.role === 'spymaster') return;
      if (game.phase !== 'guessing') return;
      const timerSec = getTimerSeconds(lobby.settings.timer);
      const afterEndTurn = applyEndTurn(game, timerSec);
      games.set(code, afterEndTurn);
      broadcastGame(io, code);
      if (afterEndTurn.timerEndsAt) scheduleTimer(io, code, afterEndTurn.timerEndsAt);
    });

    // ─── GAME: RETURN TO LOBBY ───────────────────────────────────────────────
    socket.on('game:return-lobby', () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby) return;
      if (lobby.hostUserId !== user.userId) return; // host only
      games.delete(code);
      gameSpectatorSlots.delete(code);
      lobby.status = 'waiting';
      // Remove spectators and clear past-player records
      lobby.players = lobby.players.filter(p => p.role !== 'spectator');
      for (const key of pastPlayers.keys()) { if (key.endsWith(`:${code}`)) pastPlayers.delete(key); }
      io.to(code).emit('lobby:returned', lobbyPublic(lobby));
    });

    // ─── LOBBY: BECOME SPECTATOR ─────────────────────────────────────────────
    socket.on('lobby:spectate', () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby || lobby.status !== 'waiting') return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player) return;
      player.role = 'spectator';
      player.team = null;
      broadcastLobby(io, code);
    });

    // ─── PLAYER: UPDATE AVATAR ───────────────────────────────────────────────
    socket.on('player:avatar', (avatarId: number) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player) return;
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
      if (!code) return;

      const lobby = lobbies.get(code);
      if (!lobby) return;

      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Schedule removal after grace period
      const timerKey = `${player.userId}:${code}`;
      const timer = setTimeout(() => {
        disconnectTimers.delete(timerKey);
        const l = lobbies.get(code);
        if (!l) return;
        l.players = l.players.filter(p => p.userId !== player.userId);
        if (l.players.length === 0) { lobbies.delete(code); games.delete(code); return; }
        if (!l.players.some(p => p.userId === l.hostUserId)) l.hostUserId = l.players[0].userId;
        broadcastLobby(io, code);
      }, 60_000);
      disconnectTimers.set(timerKey, timer);
      // No broadcastLobby — others keep seeing them in the list during grace period
    });
  });
}

function handleLeave(socket: Socket, io: IOServer) {
  const code = socketToRoom.get(socket.id);
  if (!code) return;
  socketToRoom.delete(socket.id);

  const lobby = lobbies.get(code);
  if (!lobby) return;

  const player = lobby.players.find(p => p.socketId === socket.id);
  if (player) {
    // Cancel any pending disconnect timer for this player
    const timerKey = `${player.userId}:${code}`;
    const pending = disconnectTimers.get(timerKey);
    if (pending) { clearTimeout(pending); disconnectTimers.delete(timerKey); }

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
    return;
  }

  if (!lobby.players.some(p => p.userId === lobby.hostUserId)) {
    lobby.hostUserId = lobby.players[0].userId;
  }

  socket.leave(code);
  broadcastLobby(io, code);
}
