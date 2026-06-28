import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, DailyCard, DailyClue, DailyBoard } from '../db';
import { AuthPayload } from '../middleware/auth';

const router = Router();

const ADMIN_USERNAME = 'hiddenmb';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// In-memory sessions for in-progress daily games
// Key: `${userId}:${date}`
interface DailySession {
  userId: number;
  username: string;
  equippedAvatarId: number;
  date: string;
  board: DailyBoard;
  currentRound: number; // 0-based index into clues
  guessesThisRound: number;
  agentsFound: number;
  history: ('agent' | 'neutral' | 'avoid')[][];
  roundHistory: ('agent' | 'neutral' | 'avoid')[];
  revealedIndices: number[];
  status: 'in-progress' | 'won' | 'lost';
}

const sessions = new Map<string, DailySession>();

function sessionKey(userId: number, date: string) {
  return `${userId}:${date}`;
}

function requireAdmin(req: Request, res: Response): boolean {
  const user = (req as any).user as AuthPayload;
  if (user.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    res.status(403).json({ error: 'Admin only' });
    return false;
  }
  return true;
}

// ── Public board ─────────────────────────────────────────────────────────────

// GET /api/daily/today  — returns words + clues (no card types)
router.get('/today', requireAuth, (req: Request, res: Response) => {
  const date = todayDate();
  const board = db.getDailyBoardByDate(date);
  if (!board) {
    res.json({ date, board: null });
    return;
  }
  res.json({
    date,
    board: {
      id: board.id,
      date: board.date,
      cards: board.cards.map(c => ({ word: c.word })),
      clues: board.clues,
    },
  });
});

// GET /api/daily/session  — return current session state (or completed result)
router.get('/session', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const date = todayDate();

  // Check if they already finished
  const existing = db.getDailyResult(user.userId, date);
  if (existing) {
    res.json({ status: existing.solved ? 'won' : 'lost', result: existing, session: null });
    return;
  }

  const key = sessionKey(user.userId, date);
  const session = sessions.get(key);
  if (!session) {
    res.json({ status: 'not-started', session: null });
    return;
  }

  res.json({ status: session.status, session: serializeSession(session) });
});

// POST /api/daily/start  — start or resume session
router.post('/start', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const date = todayDate();

  if (db.getDailyResult(user.userId, date)) {
    res.status(400).json({ error: 'Already completed today\'s puzzle' });
    return;
  }

  const board = db.getDailyBoardByDate(date);
  if (!board) {
    res.status(404).json({ error: 'No daily puzzle for today' });
    return;
  }

  const key = sessionKey(user.userId, date);
  let session = sessions.get(key);
  if (!session) {
    const dbUser = db.getUserById(user.userId);
    session = {
      userId: user.userId,
      username: user.username,
      equippedAvatarId: dbUser?.equipped_avatar_id ?? 0,
      date,
      board,
      currentRound: 0,
      guessesThisRound: 0,
      agentsFound: 0,
      history: [],
      roundHistory: [],
      revealedIndices: [],
      status: 'in-progress',
    };
    sessions.set(key, session);
  }

  res.json({ session: serializeSession(session) });
});

// POST /api/daily/guess  — guess a card by index
router.post('/guess', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const date = todayDate();
  const { cardIndex } = req.body as { cardIndex: number };

  if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex > 11) {
    res.status(400).json({ error: 'Invalid card index' });
    return;
  }

  if (db.getDailyResult(user.userId, date)) {
    res.status(400).json({ error: 'Already completed' });
    return;
  }

  const key = sessionKey(user.userId, date);
  const session = sessions.get(key);
  if (!session || session.status !== 'in-progress') {
    res.status(400).json({ error: 'No active session' });
    return;
  }

  if (session.revealedIndices.includes(cardIndex)) {
    res.status(400).json({ error: 'Card already revealed' });
    return;
  }

  const clue = session.board.clues[session.currentRound];
  const maxGuesses = clue.number + 1;
  const card = session.board.cards[cardIndex];
  const outcome = card.type; // 'agent' | 'neutral' | 'avoid'

  session.revealedIndices.push(cardIndex);
  session.roundHistory.push(outcome);
  session.guessesThisRound += 1;

  let roundOver = false;
  let gameOver = false;

  if (outcome === 'agent') {
    session.agentsFound += 1;
    const totalAgents = session.board.cards.filter(c => c.type === 'agent').length;
    if (session.agentsFound >= totalAgents) {
      // Win!
      session.status = 'won';
      gameOver = true;
      roundOver = true;
    } else if (session.guessesThisRound >= maxGuesses) {
      // Used all guesses for this round
      roundOver = true;
    }
  } else if (outcome === 'avoid') {
    session.status = 'lost';
    gameOver = true;
    roundOver = true;
  } else {
    // neutral — end round
    roundOver = true;
  }

  if (roundOver && !gameOver) {
    // Advance to next round
    session.history.push([...session.roundHistory]);
    session.roundHistory = [];
    session.guessesThisRound = 0;
    session.currentRound += 1;

    if (session.currentRound >= session.board.clues.length) {
      // No more clues — loss
      session.status = 'lost';
      gameOver = true;
    }
  }

  if (gameOver) {
    // Flush any remaining round history
    if (session.roundHistory.length > 0) {
      session.history.push([...session.roundHistory]);
    }
    const totalGuesses = session.history.flat().length;
    const dbUser = db.getUserById(user.userId);
    db.saveDailyResult({
      date,
      userId: user.userId,
      username: user.username,
      equippedAvatarId: dbUser?.equipped_avatar_id ?? 0,
      solved: session.status === 'won',
      totalGuesses,
      guessHistory: session.history,
      completedAt: new Date().toISOString(),
    });
    sessions.delete(key);
  }

  res.json({
    outcome,
    cardIndex,
    roundOver,
    gameOver,
    status: session.status,
    session: gameOver ? null : serializeSession(session),
  });
});

// POST /api/daily/pass  — pass remaining guesses in current round
router.post('/pass', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const date = todayDate();

  if (db.getDailyResult(user.userId, date)) {
    res.status(400).json({ error: 'Already completed' });
    return;
  }

  const key = sessionKey(user.userId, date);
  const session = sessions.get(key);
  if (!session || session.status !== 'in-progress') {
    res.status(400).json({ error: 'No active session' });
    return;
  }

  // End round (pass)
  session.history.push([...session.roundHistory]);
  session.roundHistory = [];
  session.guessesThisRound = 0;
  session.currentRound += 1;

  let gameOver = false;
  if (session.currentRound >= session.board.clues.length) {
    session.status = 'lost';
    gameOver = true;
    if (session.history.length > 0) {
      // already pushed above
    }
    const totalGuesses = session.history.flat().length;
    const dbUser = db.getUserById(user.userId);
    db.saveDailyResult({
      date,
      userId: user.userId,
      username: user.username,
      equippedAvatarId: dbUser?.equipped_avatar_id ?? 0,
      solved: false,
      totalGuesses,
      guessHistory: session.history,
      completedAt: new Date().toISOString(),
    });
    sessions.delete(key);
  }

  res.json({
    gameOver,
    status: session.status,
    session: gameOver ? null : serializeSession(session),
  });
});

// GET /api/daily/reveal  — full board with types, only if user has completed today
router.get('/reveal', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const date = todayDate();

  const result = db.getDailyResult(user.userId, date);
  if (!result) {
    res.status(403).json({ error: 'Complete today\'s puzzle first' });
    return;
  }

  const board = db.getDailyBoardByDate(date);
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  res.json({ cards: board.cards, clues: board.clues });
});

// GET /api/daily/leaderboard  — today's leaderboard
router.get('/leaderboard', requireAuth, (_req: Request, res: Response) => {
  const date = todayDate();
  const results = db.getDailyLeaderboard(date);
  res.json({ date, results });
});

// GET /api/daily/result/:username  — get a player's result for today (for Wordle grid)
router.get('/result/:username', requireAuth, (req: Request, res: Response) => {
  const date = todayDate();
  const result = db.getDailyResultByUsername(req.params.username, date);
  if (!result) {
    res.status(404).json({ error: 'No result found' });
    return;
  }
  res.json({ result });
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

// GET /api/daily/admin/boards
router.get('/admin/boards', requireAuth, (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const boards = db.getDailyBoards().sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ boards });
});

// POST /api/daily/admin/board
router.post('/admin/board', requireAuth, (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { date, cards, clues } = req.body as { date: string; cards: DailyCard[]; clues: DailyClue[] };

  if (!date || !cards || !clues) {
    res.status(400).json({ error: 'date, cards, and clues are required' });
    return;
  }
  if (cards.length !== 12) {
    res.status(400).json({ error: 'Exactly 12 cards required' });
    return;
  }
  const agentCount = cards.filter(c => c.type === 'agent').length;
  const avoidCount = cards.filter(c => c.type === 'avoid').length;
  if (agentCount !== 5) {
    res.status(400).json({ error: 'Exactly 5 agent cards required' });
    return;
  }
  if (avoidCount !== 1) {
    res.status(400).json({ error: 'Exactly 1 avoid card required' });
    return;
  }
  if (clues.length < 1 || clues.length > 4) {
    res.status(400).json({ error: '1–4 clues required' });
    return;
  }
  if (db.getDailyBoardByDate(date)) {
    res.status(400).json({ error: `A board for ${date} already exists` });
    return;
  }

  const board = db.createDailyBoard(date, cards, clues);
  res.status(201).json({ board });
});

// PUT /api/daily/admin/board/:id
router.put('/admin/board/:id', requireAuth, (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const { date, cards, clues } = req.body as { date: string; cards: DailyCard[]; clues: DailyClue[] };

  if (!date || !cards || !clues) {
    res.status(400).json({ error: 'date, cards, and clues are required' });
    return;
  }
  if (cards.length !== 12) {
    res.status(400).json({ error: 'Exactly 12 cards required' });
    return;
  }
  const agentCount = cards.filter(c => c.type === 'agent').length;
  const avoidCount = cards.filter(c => c.type === 'avoid').length;
  if (agentCount !== 5) {
    res.status(400).json({ error: 'Exactly 5 agent cards required' });
    return;
  }
  if (avoidCount !== 1) {
    res.status(400).json({ error: 'Exactly 1 avoid card required' });
    return;
  }
  if (clues.length < 1 || clues.length > 4) {
    res.status(400).json({ error: '1–4 clues required' });
    return;
  }

  const existing = db.getDailyBoardByDate(date);
  if (existing && existing.id !== id) {
    res.status(400).json({ error: `Another board for ${date} already exists` });
    return;
  }

  const board = db.updateDailyBoard(id, date, cards, clues);
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json({ board });
});

// DELETE /api/daily/admin/results/:date  — wipe all results for a date
router.delete('/admin/results/:date', requireAuth, (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { date } = req.params;
  // Also clear any in-memory sessions for that date
  for (const key of sessions.keys()) {
    if (key.endsWith(`:${date}`)) sessions.delete(key);
  }
  const cleared = db.clearDailyResults(date);
  res.json({ ok: true, cleared });
});

// DELETE /api/daily/admin/board/:id
router.delete('/admin/board/:id', requireAuth, (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const ok = db.deleteDailyBoard(id);
  if (!ok) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json({ ok: true });
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function serializeSession(s: DailySession) {
  const clue = s.board.clues[s.currentRound] ?? null;
  const maxGuesses = clue ? clue.number + 1 : 0;
  return {
    currentRound: s.currentRound,
    totalRounds: s.board.clues.length,
    guessesThisRound: s.guessesThisRound,
    maxGuessesThisRound: maxGuesses,
    agentsFound: s.agentsFound,
    totalAgents: s.board.cards.filter(c => c.type === 'agent').length,
    history: s.history,
    roundHistory: s.roundHistory,
    revealedCards: s.revealedIndices.map(idx => ({
      index: idx,
      type: s.board.cards[idx].type,
    })),
    clue,
    status: s.status,
  };
}

export default router;
