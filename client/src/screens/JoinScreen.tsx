import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { useGame } from '../context/GameContext';

export function JoinScreen() {
  const navigate = useNavigate();
  const { joinLobby, lobby, game, lobbyError, clearLobbyError } = useGame();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!lobby) return;
    if (game || lobby.status === 'in-game') navigate('/game');
    else navigate('/lobby');
  }, [lobby, game, navigate]);

  const handleJoin = () => {
    if (code.trim().length < 5) return;
    clearLobbyError();
    joinLobby(code.trim().toUpperCase());
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', background: '#0e0b08' }}>
      <div style={{
        width: '100%', maxWidth: 1000,
        background: '#1b1611', borderRadius: 14,
        border: '2px solid #3a2e22',
        boxShadow: '0 22px 60px rgba(0,0,0,.5)',
        padding: '30px 36px 36px',
        fontFamily: 'Space Mono, monospace',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '2px solid #2c2319' }}>
          <Logo size="md" />
          <button onClick={() => navigate('/')} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f3e9d6',
            border: '2px solid #3a2e22', padding: '11px 14px', borderRadius: 4,
            background: 'none', cursor: 'pointer',
          }}>← BACK</button>
        </div>

        {/* centered join form */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '54px 0 40px' }}>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: '#f3e9d6', lineHeight: 1.4 }}>Join a game</h1>
          <p style={{ margin: '14px 0 0', fontSize: 14, color: '#a4927a' }}>Enter the room code your host shared with you.</p>

          <div style={{ width: 420, marginTop: 34 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1, marginBottom: 11 }}>ROOM CODE</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#120e0a', border: '2px solid #3a2e22', borderRadius: 10, padding: '18px 20px' }}>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="XXXXX"
                maxLength={5}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 22,
                  color: '#f3e9d6', letterSpacing: 8,
                }}
              />
            </div>

            {lobbyError && (
              <div style={{ marginTop: 10, fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#d65a37', letterSpacing: 0.5 }}>
                {lobbyError}
              </div>
            )}

            <GoldButton onClick={handleJoin} style={{ marginTop: 18, width: '100%', fontSize: 11, padding: '18px', letterSpacing: 1 }}>
              JOIN LOBBY →
            </GoldButton>

            <p style={{ margin: '18px 0 0', fontSize: 12, color: '#6b6155', textAlign: 'center', lineHeight: 1.6 }}>
              Don't have a code? Ask your host, or head back and host your own.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
