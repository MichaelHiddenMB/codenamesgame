const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('cw_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; username: string; userId: number; coins: number; equippedAvatarId: number }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }, false
    ),

  login: (username: string, password: string) =>
    request<{ token: string; username: string; userId: number; coins: number; equippedAvatarId: number }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false
    ),

  me: () =>
    request<{ userId: number; username: string; coins: number; equippedAvatarId: number; ownedAvatarIds: number[] }>(
      '/auth/me'
    ),

  shop: () =>
    request<{ coins: number; equippedAvatarId: number; items: Array<{ id: number; name: string; price: number; owned: boolean; equipped: boolean }> }>(
      '/shop'
    ),

  buyAvatar: (avatarId: number) =>
    request<{ coins: number }>('/shop/buy', { method: 'POST', body: JSON.stringify({ avatarId }) }),

  equipAvatar: (avatarId: number) =>
    request<{ equippedAvatarId: number }>('/shop/equip', { method: 'POST', body: JSON.stringify({ avatarId }) }),

  // ── Daily mode ──────────────────────────────────────────────────────────────
  dailyToday: () =>
    request<{ date: string; board: { id: number; date: string; cards: { word: string }[]; clues: { word: string; number: number }[] } | null }>('/daily/today'),

  dailySession: () =>
    request<{ status: 'not-started' | 'in-progress' | 'won' | 'lost'; session: DailySessionState | null; result?: DailyResultData }>('/daily/session'),

  dailyStart: () =>
    request<{ session: DailySessionState }>('/daily/start', { method: 'POST' }),

  dailyGuess: (cardIndex: number) =>
    request<{ outcome: 'agent' | 'neutral' | 'avoid'; cardIndex: number; roundOver: boolean; gameOver: boolean; status: string; session: DailySessionState | null }>('/daily/guess', { method: 'POST', body: JSON.stringify({ cardIndex }) }),

  dailyPass: () =>
    request<{ gameOver: boolean; status: string; session: DailySessionState | null }>('/daily/pass', { method: 'POST' }),

  dailyReveal: () =>
    request<{ cards: { word: string; type: 'agent' | 'neutral' | 'avoid' }[]; clues: { word: string; number: number }[] }>('/daily/reveal'),

  dailyLeaderboard: () =>
    request<{ date: string; results: DailyResultData[] }>('/daily/leaderboard'),

  dailyResultByUsername: (username: string) =>
    request<{ result: DailyResultData }>(`/daily/result/${encodeURIComponent(username)}`),

  // Admin
  adminDailyBoards: () =>
    request<{ boards: AdminDailyBoard[] }>('/daily/admin/boards'),

  adminCreateDailyBoard: (payload: { date: string; cards: { word: string; type: 'agent' | 'neutral' | 'avoid' }[]; clues: { word: string; number: number }[] }) =>
    request<{ board: AdminDailyBoard }>('/daily/admin/board', { method: 'POST', body: JSON.stringify(payload) }),

  adminUpdateDailyBoard: (id: number, payload: { date: string; cards: { word: string; type: 'agent' | 'neutral' | 'avoid' }[]; clues: { word: string; number: number }[] }) =>
    request<{ board: AdminDailyBoard }>(`/daily/admin/board/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  adminDeleteDailyBoard: (id: number) =>
    request<{ ok: boolean }>(`/daily/admin/board/${id}`, { method: 'DELETE' }),

  adminResetDailyResults: (date: string) =>
    request<{ ok: boolean; cleared: number }>(`/daily/admin/results/${encodeURIComponent(date)}`, { method: 'DELETE' }),
};

export interface DailySessionState {
  currentRound: number;
  totalRounds: number;
  guessesThisRound: number;
  maxGuessesThisRound: number;
  agentsFound: number;
  totalAgents: number;
  history: ('agent' | 'neutral' | 'avoid')[][];
  roundHistory: ('agent' | 'neutral' | 'avoid')[];
  revealedCards: { index: number; type: 'agent' | 'neutral' | 'avoid' }[];
  clue: { word: string; number: number } | null;
  status: 'in-progress' | 'won' | 'lost';
}

export interface DailyResultData {
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

export interface AdminDailyBoard {
  id: number;
  date: string;
  cards: { word: string; type: 'agent' | 'neutral' | 'avoid' }[];
  clues: { word: string; number: number }[];
  createdAt: string;
}
