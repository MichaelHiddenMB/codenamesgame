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
};
