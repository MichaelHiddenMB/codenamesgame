import { Router } from 'express';
import { db } from '../db';
import { requireAuth, AuthPayload } from '../middleware/auth';

const router = Router();

export const AVATARS = [
  { id: 1,  name: 'AGENT 01', price: 0 },
  { id: 2,  name: 'ROOKIE',   price: 0 },
  { id: 3,  name: 'SCOUT',    price: 120 },
  { id: 4,  name: 'RANGER',   price: 120 },
  { id: 5,  name: 'NOMAD',    price: 250 },
  { id: 6,  name: 'CIPHER',   price: 250 },
  { id: 7,  name: 'SPECTER',  price: 400 },
  { id: 8,  name: 'ORACLE',   price: 400 },
  { id: 9,  name: 'PHANTOM',  price: 600 },
  { id: 10, name: 'WARDEN',   price: 600 },
  { id: 11, name: 'VIPER',    price: 900 },
  { id: 12, name: 'ZENITH',   price: 900 },
  { id: 13, name: 'ECHO',     price: 1500 },
  { id: 14, name: 'TITAN',    price: 1500 },
  { id: 15, name: 'LEGEND',   price: 3000 },
];

router.get('/', requireAuth, (req, res) => {
  const { userId } = (req as any).user as AuthPayload;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const ownedSet = new Set(user.owned_avatar_ids);
  const items = AVATARS.map(a => ({
    ...a,
    owned: ownedSet.has(a.id),
    equipped: a.id === user.equipped_avatar_id,
  }));

  return res.json({ coins: user.coins, equippedAvatarId: user.equipped_avatar_id, items });
});

router.post('/buy', requireAuth, (req, res) => {
  const { userId } = (req as any).user as AuthPayload;
  const { avatarId } = req.body ?? {};
  const avatar = AVATARS.find(a => a.id === Number(avatarId));
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.owned_avatar_ids.includes(avatar.id)) return res.status(400).json({ error: 'Already owned' });
  if (user.coins < avatar.price) return res.status(400).json({ error: 'Not enough coins' });

  const newCoins = db.deductCoins(userId, avatar.price);
  db.grantAvatar(userId, avatar.id);

  return res.json({ coins: newCoins });
});

router.post('/equip', requireAuth, (req, res) => {
  const { userId } = (req as any).user as AuthPayload;
  const { avatarId } = req.body ?? {};
  const avatar = AVATARS.find(a => a.id === Number(avatarId));
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.owned_avatar_ids.includes(avatar.id)) return res.status(403).json({ error: 'Not owned' });

  db.setEquippedAvatar(userId, avatar.id);
  return res.json({ equippedAvatarId: avatar.id });
});

export default router;
