import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { api } from '../api';
import { User } from '../types';
import { getSocket, disconnectSocket } from '../socket';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateCoins: (coins: number) => void;
  updateEquipped: (avatarId: number) => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cw_token'));
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  // Whenever token changes, create/destroy the socket
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      return;
    }
    const s = getSocket(token);
    setSocket(s);
    return () => {
      // Don't disconnect on cleanup — only on explicit logout
    };
  }, [token]);

  // On mount, restore session from stored token
  useEffect(() => {
    const stored = localStorage.getItem('cw_token');
    if (!stored) { setLoading(false); return; }
    api.me()
      .then(me => {
        setUser({ ...me });
      })
      .catch(() => {
        localStorage.removeItem('cw_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = (tok: string, u: User) => {
    localStorage.setItem('cw_token', tok);
    setToken(tok);
    setUser(u);
    // socket is created via the useEffect above that watches token
  };

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    saveSession(res.token, {
      userId: res.userId, username: res.username,
      coins: res.coins, equippedAvatarId: res.equippedAvatarId,
      ownedAvatarIds: [1, 2],
    });
  };

  const register = async (username: string, password: string) => {
    const res = await api.register(username, password);
    saveSession(res.token, {
      userId: res.userId, username: res.username,
      coins: res.coins, equippedAvatarId: res.equippedAvatarId,
      ownedAvatarIds: [1, 2],
    });
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('cw_token');
    setToken(null);
    setUser(null);
    setSocket(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    const me = await api.me();
    setUser(prev => prev ? { ...prev, ...me } : null);
  };

  const updateCoins    = (coins: number)    => setUser(prev => prev ? { ...prev, coins } : null);
  const updateEquipped = (avatarId: number) => setUser(prev => prev ? { ...prev, equippedAvatarId: avatarId } : null);

  return (
    <AuthContext.Provider value={{ user, token, socket, loading, login, register, logout, refreshUser, updateCoins, updateEquipped }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
