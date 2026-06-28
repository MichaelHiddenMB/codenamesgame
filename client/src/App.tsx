import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { AccountScreen } from './screens/AccountScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CreateLobbyScreen } from './screens/CreateLobbyScreen';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameBoardScreen } from './screens/GameBoardScreen';
import { ShopScreen } from './screens/ShopScreen';
import { DailyScreen } from './screens/DailyScreen';
import { DailyAdminScreen } from './screens/DailyAdminScreen';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#e2a93b' }}>LOADING...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<AccountScreen />} />
      </Routes>
    );
  }

  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/host" element={<CreateLobbyScreen />} />
        <Route path="/join" element={<JoinScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/game" element={<GameBoardScreen />} />
        <Route path="/shop" element={<ShopScreen />} />
        <Route path="/daily" element={<DailyScreen />} />
        <Route path="/daily-admin" element={<DailyAdminScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
