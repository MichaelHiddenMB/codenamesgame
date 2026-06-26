import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { PfpAvatar } from '../components/PfpAvatar';
import { PixelCopyIcon } from '../components/PixelIcons';
import { ProfileModal } from './ProfileModal';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { Player } from '../types';

export function LobbyScreen() {
  const navigate = useNavigate();
  const { lobby, game, myRole, leaveLobby, switchTeam, setSpymaster, startGame, lobbyError, broadcastAvatar, goSpectator } = useGame();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reconnectReady, setReconnectReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReconnectReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (reconnectReady && !lobby) navigate('/');
  }, [lobby, navigate, reconnectReady]);

  useEffect(() => {
    if (game || (lobby?.status === 'in-game')) navigate('/game');
  }, [game, lobby, navigate]);

  if (!lobby || !user) return null;

  const isHost = lobby.hostUserId === user.userId;
  const myTeam = myRole?.team ?? null;
  const isSpectating = myRole?.role === 'spectator';
  const rustPlayers = lobby.players.filter(p => p.team === 'rust');
  const tealPlayers = lobby.players.filter(p => p.team === 'teal');
  const spectators   = lobby.players.filter(p => p.role === 'spectator');

  const rustSpymaster = rustPlayers.find(p => p.role === 'spymaster');
  const tealSpymaster = tealPlayers.find(p => p.role === 'spymaster');
  const activePlayers = rustPlayers.length + tealPlayers.length;
  const canStart = rustPlayers.length >= 2 && tealPlayers.length >= 2 && !!rustSpymaster && !!tealSpymaster;

  const readyText = canStart
    ? `${activePlayers} agents · both teams have a spymaster`
    : `Waiting for players... (each team needs a spymaster + 1 operative)`;

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLeave = () => {
    leaveLobby();
    navigate('/');
  };

  return (
    <>
    {showProfile && (
      <ProfileModal
        onClose={() => setShowProfile(false)}
        onEquip={broadcastAvatar}
      />
    )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="pulse-dot" style={{ width: 9, height: 9, borderRadius: 2, background: '#e2a93b', boxShadow: '0 0 9px #e2a93b', display: 'inline-block' }} />
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#f3e9d6' }}>LOBBY · WAITING</span>
          </div>
          <button onClick={handleLeave} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f3e9d6',
            border: '2px solid #3a2e22', padding: '11px 14px', borderRadius: 4,
            background: 'none', cursor: 'pointer',
          }}>← LEAVE</button>
        </div>

        {/* room code */}
        <div style={{ padding: '22px 0', borderBottom: '2px solid #2c2319' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1, marginBottom: 13 }}>ROOM CODE</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#120e0a', border: '2px solid #3a2e22', borderRadius: 10, overflow: 'hidden' }}>
            <span style={{ padding: '16px 24px', fontFamily: "'Press Start 2P', monospace", fontSize: 26, color: '#e2a93b', letterSpacing: 10 }}>
              {lobby.code}
            </span>
            <span style={{ alignSelf: 'stretch', width: 2, background: '#3a2e22' }} />
            <button onClick={copyCode} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '0 20px', alignSelf: 'stretch',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              color: copied ? '#2f9c8f' : '#f3e9d6',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              <PixelCopyIcon size={15} />
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>

        {/* teams */}
        <div style={{ display: 'flex', gap: 18, marginTop: 24 }}>
          <TeamColumn
            team="rust" label="RUST" accentColor="#d65a37"
            borderColor="#6a3320"
            players={rustPlayers}
            myUserId={user.userId}
            isMyTeam={myTeam === 'rust'}
            onSwitchTeam={() => switchTeam('rust')}
            onSetSpymaster={setSpymaster}
            onAvatarClick={() => setShowProfile(true)}
          />

          {/* VS divider */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ width: 2, flex: 1, background: '#2c2319' }} />
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#5f5547' }}>VS</span>
            <div style={{ width: 2, flex: 1, background: '#2c2319' }} />
          </div>

          <TeamColumn
            team="teal" label="TEAL" accentColor="#2f9c8f"
            borderColor="#1e5550"
            players={tealPlayers}
            myUserId={user.userId}
            isMyTeam={myTeam === 'teal'}
            onSwitchTeam={() => switchTeam('teal')}
            onSetSpymaster={setSpymaster}
            onAvatarClick={() => setShowProfile(true)}
          />
        </div>

        {/* spectators section — visible to everyone */}
        <div style={{ marginTop: 20, padding: '14px 18px', background: '#15110c', border: '1px solid #2c2319', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547', letterSpacing: 1, flexShrink: 0 }}>SPECTATORS</span>
          {spectators.length === 0 ? (
            <span style={{ fontSize: 12, color: '#3a2e22' }}>none</span>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {spectators.map(p => (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', background: '#1b1611', border: '1px solid #3a2e22', borderRadius: 6 }}>
                  <PfpAvatar size={20} />
                  <span style={{ fontSize: 12, color: '#8c7c68', fontWeight: 700 }}>{p.username.toUpperCase()}</span>
                  {p.userId === user.userId && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#5f5547' }}>YOU</span>}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginLeft: 'auto' }}>
            {isSpectating ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => switchTeam('rust')} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#d65a37', border: '1px solid #6a3320', padding: '8px 12px', borderRadius: 5, background: 'none', cursor: 'pointer' }}>
                  JOIN RUST
                </button>
                <button onClick={() => switchTeam('teal')} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#2f9c8f', border: '1px solid #1e5550', padding: '8px 12px', borderRadius: 5, background: 'none', cursor: 'pointer' }}>
                  JOIN TEAL
                </button>
              </div>
            ) : (
              <button onClick={goSpectator} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', border: '1px solid #2c2319', padding: '8px 12px', borderRadius: 5, background: 'none', cursor: 'pointer' }}>
                SPECTATE
              </button>
            )}
          </div>
        </div>

        {lobbyError && (
          <div style={{ marginTop: 12, fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#d65a37' }}>{lobbyError}</div>
        )}

        {/* start bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 24, paddingTop: 20, borderTop: '2px solid #2c2319' }}>
          <div>
            <div style={{ fontSize: 13, color: '#f3e9d6' }}>{readyText}</div>
            <div style={{ fontSize: 11, color: '#6b6155', marginTop: 5 }}>Only the host can start the game.</div>
          </div>
          <GoldButton
            onClick={startGame}
            disabled={!isHost || !canStart}
            style={{ marginLeft: 'auto', fontSize: 13, padding: '18px 30px', letterSpacing: 1, opacity: (!isHost || !canStart) ? 0.5 : 1 }}
          >
            START GAME →
          </GoldButton>
        </div>
      </div>
    </div>
    </>
  );
}

function TeamColumn({
  team, label, accentColor, borderColor, players, myUserId, isMyTeam, onSwitchTeam, onSetSpymaster, onAvatarClick,
}: {
  team: 'rust' | 'teal';
  label: string;
  accentColor: string;
  borderColor: string;
  players: Player[];
  myUserId: number;
  isMyTeam: boolean;
  onSwitchTeam: () => void;
  onSetSpymaster: (userId: number) => void;
  onAvatarClick: () => void;
}) {
  const spymaster = players.find(p => p.role === 'spymaster');
  const operatives = players.filter(p => p.role === 'operative');

  return (
    <div style={{
      flex: 1, background: '#15110c',
      border: '2px solid #3a2e22', borderTop: `4px solid ${accentColor}`,
      borderRadius: 12, padding: 18,
      boxShadow: 'inset 0 0 40px rgba(0,0,0,.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '2px solid #2c2319' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: accentColor, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#8c7c68' }}>{players.length} player{players.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8c7c68', letterSpacing: 1, margin: '16px 0 11px' }}>★ SPYMASTER</div>
      {spymaster ? (
        <PlayerRow player={spymaster} myUserId={myUserId} isSpymaster onSetSpymaster={onSetSpymaster} onAvatarClick={onAvatarClick} />
      ) : (
        <div style={{ fontSize: 12, color: '#5f5547', padding: '9px 10px', background: '#1b1611', borderRadius: 8, border: '1px dashed #3a2e22' }}>
          No spymaster yet
        </div>
      )}

      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8c7c68', letterSpacing: 1, margin: '18px 0 11px' }}>OPERATIVES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {operatives.map(p => (
          <PlayerRow key={p.userId} player={p} myUserId={myUserId} onSetSpymaster={onSetSpymaster} teamAccent={accentColor} onAvatarClick={onAvatarClick} />
        ))}
        {operatives.length === 0 && (
          <div style={{ fontSize: 12, color: '#5f5547', padding: '8px 10px' }}>—</div>
        )}
      </div>

      <button onClick={onSwitchTeam} style={{
        marginTop: 18, width: '100%',
        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
        color: isMyTeam ? '#5f5547' : accentColor,
        border: `2px solid ${isMyTeam ? '#2c2319' : borderColor}`,
        padding: 13, borderRadius: 6, textAlign: 'center',
        background: 'none', cursor: isMyTeam ? 'default' : 'pointer',
      }}>
        {isMyTeam ? 'ON THIS TEAM' : `MOVE TO ${label}`}
      </button>
    </div>
  );
}

function PlayerRow({ player, myUserId, isSpymaster, onSetSpymaster, teamAccent, onAvatarClick }: {
  player: Player;
  myUserId: number;
  isSpymaster?: boolean;
  onSetSpymaster: (userId: number) => void;
  teamAccent?: string;
  onAvatarClick: () => void;
}) {
  const isMe = player.userId === myUserId;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: isSpymaster ? '9px 10px' : '8px 10px',
      background: isSpymaster ? '#221a14' : isMe ? 'rgba(47,156,143,.1)' : 'transparent',
      border: isSpymaster ? '1px solid #3a2e22' : isMe ? '1px solid rgba(47,156,143,.3)' : '1px solid #241c14',
      borderRadius: 8,
    }}>
      <div
        onClick={isMe ? onAvatarClick : undefined}
        title={isMe ? 'Change avatar' : undefined}
        style={{ position: 'relative', cursor: isMe ? 'pointer' : 'default', flexShrink: 0 }}
      >
        <PfpAvatar size={32} />
        {isMe && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6,
            background: 'rgba(0,0,0,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity .15s',
            fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#e2a93b',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          >EDIT</div>
        )}
      </div>
      <span style={{ flex: 1, fontSize: 14, color: '#f3e9d6', fontWeight: 700 }}>
        {player.username.toUpperCase()}
        {isMe && (
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: teamAccent ?? '#2f9c8f', marginLeft: 6 }}>YOU</span>
        )}
      </span>
      {isSpymaster ? (
        <span style={{ fontSize: 14, color: '#e2a93b' }}>★</span>
      ) : (
        <button onClick={() => onSetSpymaster(player.userId)} style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          color: '#7c7163', border: '1px solid #3a2e22',
          padding: '7px 9px', borderRadius: 5,
          background: 'none', cursor: 'pointer',
        }}>★ SET</button>
      )}
    </div>
  );
}
