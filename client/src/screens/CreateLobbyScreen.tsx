import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { useGame } from '../context/GameContext';
import { GameMode, TimerOption } from '../types';

const MODES: GameMode[] = ['CLASSIC', 'FRIEND', 'EXTENDED'];
const TIMERS: TimerOption[] = ['off', '30', '60', '90'];
const TIMER_LABELS: Record<TimerOption, string> = { off: 'OFF', '30': '30s', '60': '60s', '90': '90s' };

export function CreateLobbyScreen() {
  const navigate = useNavigate();
  const { createLobby, lobby } = useGame();
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [timer, setTimer] = useState<TimerOption>('60');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [powerUps, setPowerUps] = useState(true);

  React.useEffect(() => {
    if (lobby) navigate('/lobby');
  }, [lobby, navigate]);

  const handleCreate = () => {
    createLobby(mode, timer, maxPlayers, powerUps);
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1, marginBottom: 14,
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
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#8c7c68', letterSpacing: 1 }}>NEW LOBBY</span>
          <button onClick={() => navigate('/')} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f3e9d6',
            border: '2px solid #3a2e22', padding: '11px 14px', borderRadius: 4,
            background: 'none', cursor: 'pointer',
          }}>← BACK</button>
        </div>

        {/* title */}
        <div style={{ marginTop: 26 }}>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: '#f3e9d6', lineHeight: 1.4 }}>Game settings</h1>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#a4927a' }}>Set the rules, then create your lobby and share the code.</p>
        </div>

        {/* GAME MODE */}
        <div style={{ marginTop: 28 }}>
          <div style={labelStyle}>GAME MODE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {MODES.map(m => {
              const selected = m === mode;
              return (
                <button key={m} onClick={() => setMode(m)} style={{
                  background: selected ? '#221a14' : '#15110c',
                  border: `2px solid ${selected ? '#e2a93b' : '#3a2e22'}`,
                  borderRadius: 12, padding: '20px 18px',
                  cursor: 'pointer',
                  boxShadow: selected ? '0 0 0 3px rgba(226,169,59,.12)' : 'none',
                  textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: selected ? '#e2a93b' : '#f3e9d6' }}>{m}</span>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: selected ? '#e2a93b' : 'transparent',
                      border: selected ? 'none' : '2px solid #3a2e22',
                      color: '#1b1611', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    }}>{selected ? '✓' : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TIMER + MAX PLAYERS */}
        <div style={{ display: 'flex', gap: 30, marginTop: 30 }}>
          {/* timer */}
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>TURN TIMER</div>
            <div style={{ display: 'flex', gap: 9 }}>
              {TIMERS.map(t => {
                const sel = t === timer;
                return (
                  <button key={t} onClick={() => setTimer(t)} style={{
                    flex: 1, textAlign: 'center',
                    fontFamily: "'Press Start 2P', monospace", fontSize: 10,
                    color: sel ? '#1b1611' : '#8c7c68',
                    background: sel ? '#e2a93b' : '#15110c',
                    border: `2px solid ${sel ? '#e2a93b' : '#3a2e22'}`,
                    borderRadius: 8, padding: '15px 0',
                    cursor: 'pointer',
                    boxShadow: sel ? '0 3px 0 #a87a1f' : 'none',
                  }}>{TIMER_LABELS[t]}</button>
                );
              })}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b6155' }}>How long each team has to give a clue and guess.</p>
          </div>

          {/* max players */}
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>MAX PLAYERS</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#15110c', border: '2px solid #3a2e22', borderRadius: 8, padding: '9px 12px' }}>
              <button onClick={() => setMaxPlayers(p => Math.max(4, p - 1))} style={{
                width: 46, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: '#f3e9d6',
                border: '2px solid #3a2e22', borderRadius: 6, cursor: 'pointer', background: 'none',
              }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: '#e2a93b' }}>{maxPlayers}</span>
              <button onClick={() => setMaxPlayers(p => Math.min(16, p + 1))} style={{
                width: 46, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: '#1b1611',
                background: '#e2a93b', border: 'none', borderRadius: 6, cursor: 'pointer',
                boxShadow: '0 3px 0 #a87a1f',
              }}>+</button>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b6155' }}>Total agents allowed across both teams (4–16).</p>
          </div>
        </div>

        {/* POWER-UPS */}
        <div style={{ marginTop: 30 }}>
          <div style={labelStyle}>POWER-UPS</div>
          <button onClick={() => setPowerUps(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 16, width: '100%',
            background: powerUps ? '#221a14' : '#15110c',
            border: `2px solid ${powerUps ? '#e2a93b' : '#3a2e22'}`,
            boxShadow: powerUps ? '0 0 0 3px rgba(226,169,59,.12)' : 'none',
            borderRadius: 12, padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{
              width: 42, height: 24, borderRadius: 12, flexShrink: 0,
              background: powerUps ? '#e2a93b' : '#3a2e22',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: powerUps ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: powerUps ? '#1b1611' : '#6b6155',
                transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: powerUps ? '#e2a93b' : '#f3e9d6' }}>
                {powerUps ? 'ENABLED' : 'DISABLED'}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b6155', lineHeight: 1.5 }}>
                Players can spend coins in-game to reveal words, steal neutrals, upgrade clues, and more.
              </p>
            </div>
          </button>
        </div>

        {/* create bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32, paddingTop: 22, borderTop: '2px solid #2c2319' }}>
          <div style={{ fontSize: 13, color: '#a4927a' }}>A 5-character room code is generated when you create the lobby.</div>
          <GoldButton onClick={handleCreate} style={{ marginLeft: 'auto', fontSize: 13, padding: '18px 30px', letterSpacing: 1 }}>
            CREATE LOBBY →
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
