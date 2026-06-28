"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(__dirname, '../../data');
if (!fs_1.default.existsSync(DATA_DIR))
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path_1.default.join(DATA_DIR, 'db.json');
const DB_DEFAULTS = {
    users: [], nextUserId: 1,
    dailyBoards: [], nextDailyBoardId: 1,
    dailyResults: [], nextDailyResultId: 1,
};
function readDb() {
    if (!fs_1.default.existsSync(DB_PATH))
        return { ...DB_DEFAULTS };
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(DB_PATH, 'utf-8'));
        return { ...DB_DEFAULTS, ...parsed };
    }
    catch {
        return { ...DB_DEFAULTS };
    }
}
function writeDb(data) {
    fs_1.default.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
exports.db = {
    getUserByUsername(username) {
        const data = readDb();
        return data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    },
    getUserById(id) {
        const data = readDb();
        return data.users.find(u => u.id === id);
    },
    createUser(username, password_hash) {
        const data = readDb();
        const user = {
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
    deductCoins(userId, amount) {
        const data = readDb();
        const user = data.users.find(u => u.id === userId);
        if (!user)
            throw new Error('User not found');
        user.coins = Math.max(0, user.coins - amount);
        writeDb(data);
        return user.coins;
    },
    addCoins(userId, amount) {
        const data = readDb();
        const user = data.users.find(u => u.id === userId);
        if (!user)
            throw new Error('User not found');
        user.coins += amount;
        writeDb(data);
        return user.coins;
    },
    grantAvatar(userId, avatarId) {
        const data = readDb();
        const user = data.users.find(u => u.id === userId);
        if (!user)
            throw new Error('User not found');
        if (!user.owned_avatar_ids.includes(avatarId)) {
            user.owned_avatar_ids.push(avatarId);
            writeDb(data);
        }
    },
    setEquippedAvatar(userId, avatarId) {
        const data = readDb();
        const user = data.users.find(u => u.id === userId);
        if (!user)
            throw new Error('User not found');
        user.equipped_avatar_id = avatarId;
        writeDb(data);
    },
    // ── Daily boards ────────────────────────────────────────────────────────────
    getDailyBoards() {
        return readDb().dailyBoards;
    },
    getDailyBoardByDate(date) {
        return readDb().dailyBoards.find(b => b.date === date);
    },
    getDailyBoardById(id) {
        return readDb().dailyBoards.find(b => b.id === id);
    },
    createDailyBoard(date, cards, clues) {
        const data = readDb();
        const board = {
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
    updateDailyBoard(id, date, cards, clues) {
        const data = readDb();
        const board = data.dailyBoards.find(b => b.id === id);
        if (!board)
            return undefined;
        board.date = date;
        board.cards = cards;
        board.clues = clues;
        writeDb(data);
        return board;
    },
    deleteDailyBoard(id) {
        const data = readDb();
        const idx = data.dailyBoards.findIndex(b => b.id === id);
        if (idx === -1)
            return false;
        data.dailyBoards.splice(idx, 1);
        writeDb(data);
        return true;
    },
    // ── Daily results ────────────────────────────────────────────────────────────
    getDailyResult(userId, date) {
        return readDb().dailyResults.find(r => r.userId === userId && r.date === date);
    },
    getDailyLeaderboard(date) {
        const results = readDb().dailyResults.filter(r => r.date === date);
        return results.sort((a, b) => {
            // Winners first, then losers
            if (a.solved !== b.solved)
                return a.solved ? -1 : 1;
            // Among winners: fewest guesses first, then earliest completion
            if (a.totalGuesses !== b.totalGuesses)
                return a.totalGuesses - b.totalGuesses;
            return a.completedAt < b.completedAt ? -1 : 1;
        });
    },
    getDailyResultByUsername(username, date) {
        return readDb().dailyResults.find(r => r.username.toLowerCase() === username.toLowerCase() && r.date === date);
    },
    saveDailyResult(result) {
        const data = readDb();
        const r = { id: data.nextDailyResultId++, ...result };
        data.dailyResults.push(r);
        writeDb(data);
        return r;
    },
    clearDailyResults(date) {
        const data = readDb();
        const before = data.dailyResults.length;
        data.dailyResults = data.dailyResults.filter(r => r.date !== date);
        writeDb(data);
        return before - data.dailyResults.length;
    },
};
