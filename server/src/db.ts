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

interface DbData {
  users: User[];
  nextUserId: number;
}

function readDb(): DbData {
  if (!fs.existsSync(DB_PATH)) return { users: [], nextUserId: 1 };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DbData;
  } catch {
    return { users: [], nextUserId: 1 };
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
      coins: 200,
      equipped_avatar_id: 1,
      owned_avatar_ids: [1, 2],
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
};
