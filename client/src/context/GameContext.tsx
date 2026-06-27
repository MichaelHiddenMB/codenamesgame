import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LobbyState, GameState, GameMode, TimerOption } from '../types';
import { useAuth } from './AuthContext';

interface GameContextValue {
  lobby: LobbyState | null;
  game: GameState | null;
  myRole: { team: 'rust' | 'teal' | null; role: 'spymaster' | 'operative' | 'spectator' } | null;
  createLobby: (mode: GameMode, timer: TimerOption, maxPlayers: number, powerUps: boolean) => void;
  joinLobby: (code: string) => void;
  leaveLobby: () => void;
  returnToLobby: () => void;
  switchTeam: (team: 'rust' | 'teal') => void;
  setSpymaster: (userId: number) => void;
  startGame: () => void;
  submitClue: (word: string, number: number, word2?: string) => void;
  buyPowerUp: (type: string) => void;
  guessCard: (index: number) => void;
  endTurn: () => void;
  broadcastAvatar: (avatarId: number) => void;
  goSpectator: () => void;
  lobbyError: string | null;
  clearLobbyError: () => void;
}

const GameContext = createContext<GameContextValue>(null!);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket, user, refreshUser } = useAuth();
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [game, setGame]   = useState<GameState | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const myRole = lobby && user
    ? (() => { const p = lobby.players.find(p => p.userId === user.userId); return p ? { team: p.team, role: p.role } : null; })()
    : null;

  useEffect(() => {
    if (!socket) return;

    const onCreated  = ({ lobby: l }: { code: string; lobby: LobbyState }) => setLobby(l);
    const onJoined   = ({ lobby: l }: { lobby: LobbyState }) => setLobby(l);
    const onUpdate   = (l: LobbyState) => setLobby(l);
    const onError    = (msg: string)   => setLobbyError(msg);
    const onReturned = (l: LobbyState) => { setLobby(l); setGame(null); };
    const onGame     = (g: GameState)  => {
      setGame(g);
      if (g.winner) {
        setLobby(prev => prev ? { ...prev, status: 'in-game' } : prev);
        refreshUser();
      }
    };
    const onCoins = () => refreshUser(); // power-up purchase deducted coins

    socket.on('lobby:created',  onCreated);
    socket.on('lobby:joined',   onJoined);
    socket.on('lobby:update',   onUpdate);
    socket.on('lobby:error',    onError);
    socket.on('lobby:returned', onReturned);
    socket.on('game:update',    onGame);
    socket.on('user:coins',     onCoins);

    return () => {
      socket.off('lobby:created',  onCreated);
      socket.off('lobby:joined',   onJoined);
      socket.off('lobby:update',   onUpdate);
      socket.off('lobby:error',    onError);
      socket.off('lobby:returned', onReturned);
      socket.off('game:update',    onGame);
      socket.off('user:coins',     onCoins);
    };
  }, [socket, refreshUser]);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    if (!socket) { console.warn('[socket] not connected, cannot emit', event); return; }
    socket.emit(event, ...args);
  }, [socket]);

  const createLobby   = useCallback((mode: GameMode, timer: TimerOption, maxPlayers: number, powerUps: boolean) =>
    emit('lobby:create', { mode, timer, maxPlayers, powerUps }), [emit]);

  const joinLobby     = useCallback((code: string) => emit('lobby:join', code), [emit]);
  const switchTeam    = useCallback((team: 'rust' | 'teal') => emit('lobby:team', team), [emit]);
  const setSpymaster  = useCallback((userId: number) => emit('lobby:spymaster', userId), [emit]);
  const startGame     = useCallback(() => emit('lobby:start'), [emit]);
  const submitClue    = useCallback((word: string, number: number, word2?: string) => emit('game:clue', { word, number, word2 }), [emit]);
  const buyPowerUp    = useCallback((type: string) => emit('game:powerup', { type }), [emit]);
  const guessCard     = useCallback((index: number) => emit('game:guess', index), [emit]);
  const endTurn       = useCallback(() => emit('game:end-turn'), [emit]);
  const broadcastAvatar = useCallback((avatarId: number) => emit('player:avatar', avatarId), [emit]);
  const returnToLobby  = useCallback(() => emit('game:return-lobby'), [emit]);
  const goSpectator    = useCallback(() => emit('lobby:spectate'), [emit]);

  const leaveLobby = useCallback(() => {
    emit('lobby:leave');
    setLobby(null);
    setGame(null);
  }, [emit]);

  const clearLobbyError = useCallback(() => setLobbyError(null), []);

  return (
    <GameContext.Provider value={{
      lobby, game, myRole, lobbyError, clearLobbyError,
      createLobby, joinLobby, leaveLobby, returnToLobby, goSpectator,
      switchTeam, setSpymaster, startGame, submitClue, guessCard,
      endTurn, broadcastAvatar, buyPowerUp,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
