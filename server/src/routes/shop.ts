import { Router } from 'express';
import { db } from '../db';
import { requireAuth, AuthPayload } from '../middleware/auth';

const router = Router();

export const AVATARS = [
  { id: 2,  name: 'MOD',              price: 50 },
  { id: 3,  name: 'MR4',              price: 50 },
  { id: 9,  name: 'BWU',              price: 50 },
  { id: 15, name: 'GOJO',             price: 50 },
  { id: 16, name: 'SENKU',            price: 50 },
  { id: 4,  name: 'PETAH',            price: 100 },
  { id: 8,  name: 'HUNGRYNELL',       price: 100 },
  { id: 10, name: 'MIDGET',           price: 100 },
  { id: 1,  name: 'AMARI',            price: 150 },
  { id: 5,  name: 'CHUDMB',           price: 150 },
  { id: 6,  name: 'VILLY',            price: 150 },
  { id: 17, name: 'GILLY',            price: 150 },
  { id: 19, name: 'MOHAMED',          price: 150 },
  { id: 7,  name: 'BACKSHOTS',        price: 200 },
  { id: 12, name: 'RATSUM',           price: 200 },
  { id: 14, name: 'CARSON',           price: 200 },
  { id: 20, name: 'WATERMELON',       price: 200 },
  { id: 18, name: 'SETHS CREATION',   price: 250 },
  { id: 13, name: 'LOVERS',           price: 300 },
  { id: 11, name: 'NAH HONEY IM GOOD', price: 500 },
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
