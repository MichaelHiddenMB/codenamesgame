export type Team = 'rust' | 'teal';
export type CardTeam = Team | 'neutral' | 'avoid' | 'hidden';
export type GamePhase = 'giving-clue' | 'guessing' | 'over';
export type GameMode = 'CLASSIC' | 'FRIEND' | 'EXTENDED';
export type TimerOption = 'off' | '30' | '60' | '90';

export interface User {
  userId: number;
  username: string;
  coins: number;
  equippedAvatarId: number;
  ownedAvatarIds: number[];
}

export interface Card {
  word: string;
  team: CardTeam;
  revealed: boolean;
}

export interface Clue {
  word: string;
  word2?: string;
  number: number;
  team: Team;
}

export interface ClueHistoryEntry {
  word: string;
  word2?: string;
  number: number;
  team: Team;
  round: number;
}

export interface Player {
  userId: number;
  username: string;
  equippedAvatarId: number;
  coins: number;
  team: Team | null;
  role: 'spymaster' | 'operative' | 'spectator';
}

export interface LobbySettings {
  mode: GameMode;
  timer: TimerOption;
  maxPlayers: number;
  powerUps: boolean;
}

export interface LobbyState {
  code: string;
  hostUserId: number;
  settings: LobbySettings;
  players: Player[];
  status: 'waiting' | 'in-game';
}

export interface GameState {
  roomCode: string;
  mode: GameMode;
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
  powerUpsEnabled: boolean;
  doubleClueTeam: Team | null;
  clueHistory: ClueHistoryEntry[];
}

export interface AvatarItem {
  id: number;
  name: string;
  price: number;
  owned: boolean;
  equipped: boolean;
}
