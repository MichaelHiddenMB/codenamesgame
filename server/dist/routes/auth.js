"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });
    const trimmed = String(username).trim();
    if (trimmed.length < 2 || trimmed.length > 20)
        return res.status(400).json({ error: 'Username must be 2–20 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
        return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores' });
    if (String(password).length < 4)
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const existing = db_1.db.getUserByUsername(trimmed);
    if (existing)
        return res.status(409).json({ error: 'Username already taken' });
    const hash = await bcryptjs_1.default.hash(String(password), 10);
    const user = db_1.db.createUser(trimmed, hash);
    const token = (0, auth_1.signToken)({ userId: user.id, username: user.username });
    return res.json({ token, username: user.username, userId: user.id, coins: user.coins, equippedAvatarId: user.equipped_avatar_id });
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });
    const user = db_1.db.getUserByUsername(String(username));
    if (!user)
        return res.status(401).json({ error: 'Invalid username or password' });
    const match = await bcryptjs_1.default.compare(String(password), user.password_hash);
    if (!match)
        return res.status(401).json({ error: 'Invalid username or password' });
    const token = (0, auth_1.signToken)({ userId: user.id, username: user.username });
    return res.json({ token, username: user.username, userId: user.id, coins: user.coins, equippedAvatarId: user.equipped_avatar_id });
});
router.get('/me', auth_1.requireAuth, (req, res) => {
    const { userId } = req.user;
    const user = db_1.db.getUserById(userId);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    return res.json({
        userId: user.id, username: user.username, coins: user.coins,
        equippedAvatarId: user.equipped_avatar_id, ownedAvatarIds: user.owned_avatar_ids,
    });
});
exports.default = router;
