import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'db.json');

interface User {
  id: number;
  username: string;
  password_hash: string;
  coins: number;
  equipped_avatar_id: number;
  owned_avatar_ids: number[];
  created_at: string;
}

export interface DailyCard {
  word: string;
  type: 'agent' | 'neutral' | 'avoid';
}

export interface DailyClue {
  word: string;
  number: number;
}

export interface DailyBoard {
  id: number;
  date: string; // YYYY-MM-DD
  cards: DailyCard[]; // exactly 12
  clues: DailyClue[]; // max 4
  createdAt: string;
}

export interface DailyResult {
  id: number;
  date: string;
  userId: number;
  username: string;
  equippedAvatarId: number;
  solved: boolean;
  totalGuesses: number;
  guessHistory: ('agent' | 'neutral' | 'avoid')[][];
  completedAt: string;
}

interface DbData {
  users: User[];
  nextUserId: number;
  dailyBoards: DailyBoard[];
  nextDailyBoardId: number;
  dailyResults: DailyResult[];
  nextDailyResultId: number;
}

const DB_DEFAULTS: DbData = {
  users: [], nextUserId: 1,
  dailyBoards: [], nextDailyBoardId: 1,
  dailyResults: [], nextDailyResultId: 1,
};

function readDb(): DbData {
  if (!fs.existsSync(DB_PATH)) return { ...DB_DEFAULTS };
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Partial<DbData>;
    return { ...DB_DEFAULTS, ...parsed };
  } catch {
    return { ...DB_DEFAULTS };
  }
}

function writeDb(data: DbData): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  getUserByUsername(username: string): User | undefined {
    const data = readDb();
    return data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserById(id: number): User | undefined {
    const data = readDb();
    return data.users.find(u => u.id === id);
  },

  createUser(username: string, password_hash: string): User {
    const data = readDb();
    const user: User = {
      id: data.nextUserId++,
      username,
      password_hash,
      coins: 100,
      equipped_avatar_id: 0,
      owned_avatar_ids: [],
      created_at: new Date().toISOString(),
    };
    data.users.push(user);
    writeDb(data);
    return user;
  },

  deductCoins(userId: number, amount: number): number {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.coins = Math.max(0, user.coins - amount);
    writeDb(data);
    return user.coins;
  },

  addCoins(userId: number, amount: number): number {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.coins += amount;
    writeDb(data);
    return user.coins;
  },

  grantAvatar(userId: number, avatarId: number): void {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    if (!user.owned_avatar_ids.includes(avatarId)) {
      user.owned_avatar_ids.push(avatarId);
      writeDb(data);
    }
  },

  setEquippedAvatar(userId: number, avatarId: number): void {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.equipped_avatar_id = avatarId;
    writeDb(data);
  },

  // ── Daily boards ────────────────────────────────────────────────────────────
  getDailyBoards(): DailyBoard[] {
    return readDb().dailyBoards;
  },

  getDailyBoardByDate(date: string): DailyBoard | undefined {
    return readDb().dailyBoards.find(b => b.date === date);
  },

  getDailyBoardById(id: number): DailyBoard | undefined {
    return readDb().dailyBoards.find(b => b.id === id);
  },

  createDailyBoard(date: string, cards: DailyCard[], clues: DailyClue[]): DailyBoard {
    const data = readDb();
    const board: DailyBoard = {
      id: data.nextDailyBoardId++,
      date,
      cards,
      clues,
      createdAt: new Date().toISOString(),
    };
    data.dailyBoards.push(board);
    writeDb(data);
    return board;
  },

  updateDailyBoard(id: number, date: string, cards: DailyCard[], clues: DailyClue[]): DailyBoard | undefined {
    const data = readDb();
    const board = data.dailyBoards.find(b => b.id === id);
    if (!board) return undefined;
    board.date = date;
    board.cards = cards;
    board.clues = clues;
    writeDb(data);
    return board;
  },

  deleteDailyBoard(id: number): boolean {
    const data = readDb();
    const idx = data.dailyBoards.findIndex(b => b.id === id);
    if (idx === -1) return false;
    data.dailyBoards.splice(idx, 1);
    writeDb(data);
    return true;
  },

  // ── Daily results ────────────────────────────────────────────────────────────
  getDailyResult(userId: number, date: string): DailyResult | undefined {
    return readDb().dailyResults.find(r => r.userId === userId && r.date === date);
  },

  getDailyLeaderboard(date: string): DailyResult[] {
    const results = readDb().dailyResults.filter(r => r.date === date);
    return results.sort((a, b) => {
      // Winners first, then losers
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      // Among winners: fewest guesses first, then earliest completion
      if (a.totalGuesses !== b.totalGuesses) return a.totalGuesses - b.totalGuesses;
      return a.completedAt < b.completedAt ? -1 : 1;
    });
  },

  getDailyResultByUsername(username: string, date: string): DailyResult | undefined {
    return readDb().dailyResults.find(
      r => r.username.toLowerCase() === username.toLowerCase() && r.date === date
    );
  },

  saveDailyResult(result: Omit<DailyResult, 'id'>): DailyResult {
    const data = readDb();
    const r: DailyResult = { id: data.nextDailyResultId++, ...result };
    data.dailyResults.push(r);
    writeDb(data);
    return r;
  },

  clearDailyResults(date: string): number {
    const data = readDb();
    const before = data.dailyResults.length;
    data.dailyResults = data.dailyResults.filter(r => r.date !== date);
    writeDb(data);
    return before - data.dailyResults.length;
  },
};
