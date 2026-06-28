"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POWER_UP_PRICES = void 0;
exports.generateBoard = generateBoard;
exports.redactBoardForOperative = redactBoardForOperative;
exports.countRemaining = countRemaining;
exports.applyGuess = applyGuess;
exports.applyClue = applyClue;
exports.applyPowerUp = applyPowerUp;
exports.applyEndTurn = applyEndTurn;
const words_1 = require("./words");
exports.POWER_UP_PRICES = {
    REVEAL_NEUTRAL: 50,
    REVEAL_FRIENDLY: 75,
    STEAL_NEUTRAL: 100,
    DOUBLE_CLUE: 100,
    REMOVE_AVOID: 100,
    REROLL_BOARD: 100,
};
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function generateBoard(mode, firstTeam = 'rust') {
    const pool = words_1.WORD_POOLS[mode] ?? words_1.WORD_POOLS.CLASSIC;
    const words = shuffle(pool).slice(0, 25);
    // 9 for first team, 8 for second, 7 neutral, 1 avoid
    const secondTeam = firstTeam === 'rust' ? 'teal' : 'rust';
    const teams = [
        ...Array(9).fill(firstTeam),
        ...Array(8).fill(secondTeam),
        ...Array(7).fill('neutral'),
        'avoid',
    ];
    const shuffledTeams = shuffle(teams);
    return words.map((word, i) => ({ word, team: shuffledTeams[i], revealed: false }));
}
function redactBoardForOperative(board) {
    return board.map(c => ({
        ...c,
        team: c.revealed ? c.team : 'hidden',
    }));
}
function countRemaining(board, team) {
    return board.filter(c => c.team === team && !c.revealed).length;
}
function applyGuess(state, cardIndex, timerSeconds) {
    const board = [...state.board];
    const card = { ...board[cardIndex] };
    if (card.revealed)
        return { newState: state, event: 'already-revealed' };
    card.revealed = true;
    board[cardIndex] = card;
    let { currentTurn, phase, activeClue, guessesUsed, winner, round, avoidPenaltyTeam } = state;
    let timerEndsAt = state.timerEndsAt;
    guessesUsed += 1;
    let event = 'correct';
    if (card.team === 'avoid') {
        // Clicking the black card is an instant loss for the guessing team
        avoidPenaltyTeam = currentTurn;
        winner = currentTurn === 'rust' ? 'teal' : 'rust';
        phase = 'over';
        event = 'avoid';
    }
    else if (card.team !== currentTurn) {
        event = card.team === 'neutral' ? 'neutral' : 'opponent';
        // Check if revealing this card completed the opponent's set
        const rustRem = countRemaining(board, 'rust');
        const tealRem = countRemaining(board, 'teal');
        if (rustRem === 0) {
            winner = 'rust';
            phase = 'over';
        }
        else if (tealRem === 0) {
            winner = 'teal';
            phase = 'over';
        }
        else {
            currentTurn = currentTurn === 'rust' ? 'teal' : 'rust';
            phase = 'giving-clue';
            activeClue = null;
            guessesUsed = 0;
            round += 1;
            timerEndsAt = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
        }
    }
    else {
        // Correct guess
        const maxGuesses = (activeClue?.number ?? 1) + 1;
        const rustRem = countRemaining(board, 'rust');
        const tealRem = countRemaining(board, 'teal');
        if (rustRem === 0) {
            winner = 'rust';
            phase = 'over';
        }
        else if (tealRem === 0) {
            winner = 'teal';
            phase = 'over';
        }
        else if (guessesUsed >= maxGuesses) {
            // Exhausted guesses: end turn
            event = 'exhausted';
            currentTurn = currentTurn === 'rust' ? 'teal' : 'rust';
            phase = 'giving-clue';
            activeClue = null;
            guessesUsed = 0;
            round += 1;
            timerEndsAt = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
        }
    }
    return {
        event,
        newState: {
            ...state,
            board,
            currentTurn,
            phase,
            activeClue,
            guessesUsed,
            rustRemaining: countRemaining(board, 'rust'),
            tealRemaining: countRemaining(board, 'teal'),
            winner: winner ?? null,
            round,
            timerEndsAt,
            avoidPenaltyTeam: avoidPenaltyTeam ?? null,
        },
    };
}
function applyClue(state, word, number, timerSeconds, word2) {
    const entry = {
        word: word.toUpperCase(),
        word2: word2 ? word2.toUpperCase() : undefined,
        number,
        team: state.currentTurn,
        round: state.round,
    };
    return {
        ...state,
        phase: 'guessing',
        activeClue: { word: entry.word, word2: entry.word2, number, team: state.currentTurn },
        guessesUsed: 0,
        timerEndsAt: timerSeconds ? Date.now() + timerSeconds * 1000 : null,
        doubleClueTeam: null,
        clueHistory: [...state.clueHistory, entry],
    };
}
function applyPowerUp(state, type, team) {
    const board = state.board.map(c => ({ ...c }));
    switch (type) {
        case 'REVEAL_FRIENDLY': {
            const candidates = board.map((_, i) => i).filter(i => board[i].team === team && !board[i].revealed);
            if (candidates.length === 0)
                return state;
            board[candidates[Math.floor(Math.random() * candidates.length)]].revealed = true;
            const rustRem = countRemaining(board, 'rust');
            const tealRem = countRemaining(board, 'teal');
            let winner = state.winner;
            let phase = state.phase;
            if (rustRem === 0) {
                winner = 'rust';
                phase = 'over';
            }
            else if (tealRem === 0) {
                winner = 'teal';
                phase = 'over';
            }
            return { ...state, board, rustRemaining: rustRem, tealRemaining: tealRem, winner, phase };
        }
        case 'STEAL_NEUTRAL': {
            const opponent = team === 'rust' ? 'teal' : 'rust';
            const candidates = board.map((_, i) => i).filter(i => board[i].team === 'neutral' && !board[i].revealed);
            if (candidates.length === 0)
                return state;
            board[candidates[Math.floor(Math.random() * candidates.length)]].team = opponent;
            return { ...state, board, rustRemaining: countRemaining(board, 'rust'), tealRemaining: countRemaining(board, 'teal') };
        }
        case 'DOUBLE_CLUE':
            return { ...state, doubleClueTeam: team };
        case 'REVEAL_NEUTRAL': {
            const candidates = board.map((_, i) => i).filter(i => board[i].team === 'neutral' && !board[i].revealed);
            if (candidates.length === 0)
                return state;
            board[candidates[Math.floor(Math.random() * candidates.length)]].revealed = true;
            return { ...state, board };
        }
        case 'REMOVE_AVOID': {
            const idx = board.findIndex(c => c.team === 'avoid' && !c.revealed);
            if (idx === -1)
                return state;
            board[idx].team = 'neutral';
            return { ...state, board };
        }
        case 'REROLL_BOARD': {
            const usedWords = new Set(board.map(c => c.word));
            const pool = words_1.WORD_POOLS[state.mode] ?? words_1.WORD_POOLS.CLASSIC;
            const available = shuffle(pool.filter(w => !usedWords.has(w)));
            let refillIdx = 0;
            for (let i = 0; i < board.length; i++) {
                if (!board[i].revealed && refillIdx < available.length) {
                    board[i] = { ...board[i], word: available[refillIdx++] };
                }
            }
            return { ...state, board };
        }
        default:
            return state;
    }
}
function applyEndTurn(state, timerSeconds) {
    const next = state.currentTurn === 'rust' ? 'teal' : 'rust';
    return {
        ...state,
        currentTurn: next,
        phase: 'giving-clue',
        activeClue: null,
        guessesUsed: 0,
        round: state.round + 1,
        timerEndsAt: timerSeconds ? Date.now() + timerSeconds * 1000 : null,
        avoidPenaltyTeam: null,
    };
}
