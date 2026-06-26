import { WORD_POOLS } from './words';

export type Team = 'rust' | 'teal';
export type CardTeam = Team | 'neutral' | 'avoid';

export interface Card {
  word: string;
  team: CardTeam;
  revealed: boolean;
}

export interface Clue {
  word: string;
  number: number;
  team: Team;
}

export type GamePhase = 'giving-clue' | 'guessing' | 'over';
export type GameMode = 'CLASSIC' | 'FRIEND' | 'EXTENDED';
export type TimerOption = 'off' | '30' | '60' | '90';

export interface GameState {
  roomCode: string;
  board: Card[];
  currentTurn: Team;
  phase: GamePhase;
  activeClue: Clue | null;
  guessesUsed: number;
  rustRemaining: number;
  tealRemaining: number;
  winner: Team | null;
  round: number;
  timerEndsAt: number | null;
  avoidPenaltyTeam: Team | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBoard(mode: GameMode, firstTeam: Team = 'rust'): Card[] {
  const pool = WORD_POOLS[mode] ?? WORD_POOLS.CLASSIC;
  const words = shuffle(pool).slice(0, 25);

  // 9 for first team, 8 for second, 7 neutral, 1 avoid
  const secondTeam: Team = firstTeam === 'rust' ? 'teal' : 'rust';
  const teams: CardTeam[] = [
    ...Array(9).fill(firstTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral' as CardTeam),
    'avoid' as CardTeam,
  ];
  const shuffledTeams = shuffle(teams);

  return words.map((word, i) => ({ word, team: shuffledTeams[i], revealed: false }));
}

export function redactBoardForOperative(board: Card[]): Card[] {
  return board.map(c => ({
    ...c,
    team: c.revealed ? c.team : ('hidden' as CardTeam),
  }));
}

export function countRemaining(board: Card[], team: Team): number {
  return board.filter(c => c.team === team && !c.revealed).length;
}

export function applyGuess(
  state: GameState,
  cardIndex: number,
  timerSeconds: number | null
): { newState: GameState; event: string } {
  const board = [...state.board];
  const card = { ...board[cardIndex] };
  if (card.revealed) return { newState: state, event: 'already-revealed' };

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
  } else if (card.team !== currentTurn) {
    // Wrong team: end turn
    event = card.team === 'neutral' ? 'neutral' : 'opponent';
    currentTurn = currentTurn === 'rust' ? 'teal' : 'rust';
    phase = 'giving-clue';
    activeClue = null;
    guessesUsed = 0;
    round += 1;
    timerEndsAt = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
  } else {
    // Correct guess
    const maxGuesses = (activeClue?.number ?? 1) + 1;
    const rustRem = countRemaining(board, 'rust');
    const tealRem = countRemaining(board, 'teal');
    if (rustRem === 0) { winner = 'rust'; phase = 'over'; }
    else if (tealRem === 0) { winner = 'teal'; phase = 'over'; }
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

export function applyClue(state: GameState, word: string, number: number, timerSeconds: number | null): GameState {
  return {
    ...state,
    phase: 'guessing',
    activeClue: { word: word.toUpperCase(), number, team: state.currentTurn },
    guessesUsed: 0,
    timerEndsAt: timerSeconds ? Date.now() + timerSeconds * 1000 : null,
  };
}

export function applyEndTurn(state: GameState, timerSeconds: number | null): GameState {
  const next: Team = state.currentTurn === 'rust' ? 'teal' : 'rust';
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
