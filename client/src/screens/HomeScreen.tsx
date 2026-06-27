import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PfpAvatar } from '../components/PfpAvatar';
import { PixelCoin, PixelMagnifier } from '../components/PixelIcons';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { ProfileModal } from './ProfileModal';

export function HomeScreen() {
  const { user, logout } = useAuth();
  const { lobby, game } = useGame();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  // Reconnect: if server restores an active session, navigate to the right screen
  useEffect(() => {
    if (game || lobby?.status === 'in-game') navigate('/game');
    else if (lobby) navigate('/lobby');
  }, [game, lobby, navigate]);

  const tiles = [
    {
      num: '01', title: 'HOST GAME', desc: 'Create a lobby.',
      accentColor: '#d65a37', icon: (
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 34, color: '#d65a37' }}>+</span>
      ),
      onClick: () => navigate('/host'),
    },
    {
      num: '02', title: 'JOIN GAME', desc: 'Enter a given code and join a lobby.',
      accentColor: '#2f9c8f', icon: <PixelMagnifier size={27} />,
      onClick: () => navigate('/join'),
    },
    {
      num: '03', title: 'SHOP', desc: 'Cash in the coins you earn for fresh avatars and profile looks.',
      accentColor: '#e2a93b', icon: <PixelCoin size={28} />,
      onClick: () => navigate('/shop'),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0e0b08' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 20px' }}>
        <div style={{
          width: '100%', maxWidth: 1000,
          background: '#1b1611', borderRadius: 14,
          border: '2px solid #3a2e22',
          boxShadow: '0 22px 60px rgba(0,0,0,.5)',
          padding: '30px 36px 36px',
          fontFamily: 'Space Mono, monospace',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22, borderBottom: '2px solid #2c2319' }}>
            <Logo size="md" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setShowProfile(true)}>
              <PfpAvatar size={38} avatarId={user?.equippedAvatarId} />
              <div style={{ lineHeight: 1.4 }}>
                <div style={{ fontSize: 14, color: '#f3e9d6', fontWeight: 700 }}>{user?.username.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9c8f', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: '#8c7c68' }}>online</span>
                </div>
              </div>
            </div>
          </div>

          {/* greeting */}
          <div style={{ marginTop: 28 }}>
            <span style={{ fontSize: 13, color: '#8c7c68', letterSpacing: 1 }}>WELCOME BACK, AGENT</span>
            <h1 style={{ margin: '8px 0 0', fontFamily: "'Press Start 2P', monospace", fontSize: 24, color: '#f3e9d6', lineHeight: 1.4 }}>
              Choose your move
            </h1>
          </div>

          {/* desktop tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 26 }}
            className="tiles-desktop">
            {tiles.map((tile) => (
              <button key={tile.num} onClick={tile.onClick} style={{
                background: '#15110c', border: `2px solid #3a2e22`,
                borderTop: `4px solid ${tile.accentColor}`,
                borderRadius: 12, padding: '26px 22px',
                display: 'flex', flexDirection: 'column', minHeight: 230,
                boxShadow: 'inset 0 0 40px rgba(0,0,0,.4)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {tile.icon}
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#3a2e22' }}>{tile.num}</span>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#f3e9d6', lineHeight: 1.5 }}>{tile.title}</div>
                  <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6, color: '#a4927a' }}>{tile.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* footer */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 26, paddingTop: 18, borderTop: '2px solid #2c2319' }}>
            <span style={{ fontSize: 11, color: '#6b6155', letterSpacing: 1 }}>CODEWORDS · v0.1</span>
            <button onClick={logout} style={{ marginLeft: 'auto', fontSize: 11, color: '#5f5547', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono, monospace' }}>
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
