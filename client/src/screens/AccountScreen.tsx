import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';

export function AccountScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'CREATE' | 'LOG IN'>('CREATE');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) { setError('Fill in both fields'); return; }
    setLoading(true);
    setError(null);
    try {
      if (tab === 'CREATE') await register(username.trim(), password);
      else await login(username.trim(), password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cardMotifs = [
    { bg: '#d65a37', border: '#a8421f' },
    { bg: '#c8b489', border: '#a08a5e' },
    { bg: '#2f9c8f', border: '#21766b' },
    { bg: '#c8b489', border: '#a08a5e' },
    { bg: '#2f9c8f', border: '#21766b' },
    { bg: '#d65a37', border: '#a8421f' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#0e0b08' }}>
      {/* ─── DESKTOP ─── */}
      <div style={{ width: '100%', maxWidth: 1000, display: 'none' }} className="desktop-card">
        <AccountDesktop
          tab={tab} setTab={setTab}
          username={username} setUsername={setUsername}
          password={password} setPassword={setPassword}
          showPw={showPw} setShowPw={setShowPw}
          error={error} loading={loading} onSubmit={submit}
          cardMotifs={cardMotifs}
        />
      </div>

      {/* ─── Responsive: single component that adjusts ─── */}
      <AccountDesktop
        tab={tab} setTab={setTab}
        username={username} setUsername={setUsername}
        password={password} setPassword={setPassword}
        showPw={showPw} setShowPw={setShowPw}
        error={error} loading={loading} onSubmit={submit}
        cardMotifs={cardMotifs}
      />
    </div>
  );
}

function AccountDesktop({ tab, setTab, username, setUsername, password, setPassword, showPw, setShowPw, error, loading, onSubmit, cardMotifs }: any) {
  return (
    <div style={{
      width: '100%', maxWidth: 1000,
      background: '#1b1611', borderRadius: 14,
      border: '2px solid #3a2e22',
      boxShadow: '0 22px 60px rgba(0,0,0,.5)',
      display: 'flex', overflow: 'hidden', minHeight: 540,
      fontFamily: 'Space Mono, monospace',
    }}>
      {/* brand panel */}
      <div style={{
        flex: 1, background: '#15110c',
        borderRight: '2px solid #2c2319',
        padding: '52px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,.5)',
      }}>
        <div>
          <Logo size="lg" inline={false} />
          <p style={{ margin: '24px 0 0', maxWidth: 300, fontSize: 14, lineHeight: 1.7, color: '#a4927a' }}>
            Two teams. One grid of secret words. Out-think the other spymaster and reach your agents first.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 8, marginTop: 40 }}>
          {cardMotifs.map((c: any, i: number) => (
            <div key={i} style={{
              aspectRatio: '16/10', borderRadius: 6,
              background: c.bg, border: `2px solid ${c.border}`,
              boxShadow: '0 3px 0 rgba(0,0,0,.34)',
            }} />
          ))}
        </div>
      </div>

      {/* form panel */}
      <div style={{ width: 440, flexShrink: 0, padding: '52px 48px', display: 'flex', flexDirection: 'column' }}>
        {/* tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #2c2319' }}>
          {(['CREATE', 'LOG IN'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0 4px 14px',
              marginRight: t === 'CREATE' ? 28 : 0,
              fontFamily: "'Press Start 2P', monospace", fontSize: 11,
              color: tab === t ? '#e2a93b' : '#5f5547',
              borderBottom: tab === t ? '3px solid #e2a93b' : '3px solid transparent',
              marginBottom: -2, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottomColor: tab === t ? '#e2a93b' : 'transparent',
              borderBottomWidth: 3, borderBottomStyle: 'solid',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ marginTop: 34 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1, marginBottom: 11 }}>USERNAME</div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#120e0a', border: '2px solid #3a2e22', borderRadius: 8, padding: '15px 16px' }}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="your_handle"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, color: '#f3e9d6', fontFamily: 'Space Mono, monospace',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1 }}>PASSWORD</span>
            <button onClick={() => setShowPw((s: boolean) => !s)} style={{ fontSize: 11, color: '#7c7163', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono, monospace' }}>
              {showPw ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#120e0a', border: '2px solid #3a2e22', borderRadius: 8, padding: '15px 16px' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="••••••••"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: showPw ? 15 : 18, color: '#f3e9d6',
                fontFamily: 'Space Mono, monospace', letterSpacing: showPw ? 0 : 3,
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, fontSize: 11, color: '#d65a37', fontFamily: "'Press Start 2P', monospace", letterSpacing: 0.5 }}>
            {error}
          </div>
        )}

        <GoldButton onClick={onSubmit} disabled={loading} style={{ marginTop: 30, fontSize: 11, padding: '18px', letterSpacing: 1 }}>
          {loading ? 'LOADING...' : tab === 'CREATE' ? 'CREATE ACCOUNT →' : 'LOG IN →'}
        </GoldButton>
      </div>
    </div>
  );
}
