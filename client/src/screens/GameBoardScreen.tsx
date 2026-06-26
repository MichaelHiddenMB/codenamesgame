import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { PfpAvatar } from '../components/PfpAvatar';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardTeam } from '../types';

export function GameBoardScreen() {
  const navigate = useNavigate();
  const { lobby, game, myRole, submitClue, guessCard, endTurn, leaveLobby, returnToLobby } = useGame();
  const { user } = useAuth();
  const [clueWord, setClueWord] = useState('');
  const [clueNumber, setClueNumber] = useState(1);
  const [reconnectReady, setReconnectReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const canEndTurnRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setReconnectReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (reconnectReady && !lobby && !game) navigate('/');
  }, [lobby, game, navigate, reconnectReady]);

  useEffect(() => {
    if (lobby && !game && lobby.status === 'waiting') navigate('/lobby');
  }, [lobby, game, navigate]);

  // Live countdown — auto-ends turn for operatives when clock hits 0
  useEffect(() => {
    if (!game?.timerEndsAt) { setTimeLeft(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((game.timerEndsAt! - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0 && canEndTurnRef.current) endTurn();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [game?.timerEndsAt, endTurn]);

  if (!game || !lobby || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#e2a93b' }}>LOADING GAME...</span>
      </div>
    );
  }

  const isSpymaster = myRole?.role === 'spymaster';
  const isMyTurn = myRole?.team === game.currentTurn;
  const canGiveClue = isSpymaster && isMyTurn && game.phase === 'giving-clue';
  const canGuess = !isSpymaster && isMyTurn && game.phase === 'guessing';
  const canEndTurn = !isSpymaster && isMyTurn && game.phase === 'guessing';
  canEndTurnRef.current = canEndTurn;

  const rustPlayers = lobby.players.filter(p => p.team === 'rust');
  const tealPlayers = lobby.players.filter(p => p.team === 'teal');

  const turnColor = game.currentTurn === 'rust' ? '#d65a37' : '#2f9c8f';
  const turnLabel = game.currentTurn === 'rust' ? 'RUST' : 'TEAL';

  const handleSubmitClue = () => {
    if (!clueWord.trim()) return;
    submitClue(clueWord.trim(), clueNumber);
    setClueWord('');
  };

  const handleLeave = () => {
    leaveLobby();
    navigate('/');
  };

  const guessDotsCount = game.activeClue ? game.activeClue.number + 1 : 0;

  const isHost = lobby.hostUserId === user.userId;
  const winnerColor = game.winner === 'rust' ? '#d65a37' : '#2f9c8f';
  const winnerGlow  = game.winner === 'rust' ? 'rgba(214,90,55,.35)' : 'rgba(47,156,143,.35)';

  return (
    <>
    {game.winner && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,6,4,.88)',
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 'clamp(32px, 6vw, 72px)',
            color: winnerColor,
            textShadow: `0 0 40px ${winnerGlow}, 0 0 80px ${winnerGlow}`,
            lineHeight: 1.3,
          }}>
            {game.winner.toUpperCase()}
            <br />
            WINS!
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 'clamp(10px, 1.5vw, 14px)', color: '#e2a93b', letterSpacing: 2 }}>
            +50 COINS FOR THE WINNING TEAM
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {isHost && (
              <GoldButton onClick={returnToLobby} style={{ fontSize: 12, padding: '18px 32px', letterSpacing: 1 }}>
                RETURN TO LOBBY
              </GoldButton>
            )}
            <GoldButton secondary onClick={handleLeave} style={{ fontSize: 12, padding: '18px 32px', letterSpacing: 1 }}>
              LEAVE GAME
            </GoldButton>
          </div>
          {!isHost && (
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', letterSpacing: 1 }}>
              WAITING FOR HOST TO RETURN TO LOBBY...
            </div>
          )}
        </div>
      </div>
    )}
    <div style={{ minHeight: '100vh', background: '#0e0b08', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 20px 20px' }}>
        <div style={{
          width: '100%', maxWidth: 1280,
          background: '#1b1611', borderRadius: 14,
          border: '2px solid #3a2e22',
          boxShadow: '0 22px 60px rgba(0,0,0,.5)',
          padding: 30,
          fontFamily: 'Space Mono, monospace',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingBottom: 20, borderBottom: '2px solid #2c2319' }}>
            <Logo size="md" />

            {/* score + timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, color: '#f0a58a' }}>{game.rustRemaining}</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#d65a37', letterSpacing: 1 }}>RUST</span>
              </div>

              {/* timer */}
              {timeLeft !== null && !game.winner && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 26,
                    color: timeLeft <= 10 ? '#d65a37' : '#e2a93b',
                    textShadow: timeLeft <= 10 ? '0 0 14px rgba(214,90,55,.6)' : 'none',
                    minWidth: 56, textAlign: 'center',
                    transition: 'color 0.3s',
                  }}>
                    {String(Math.floor(timeLeft / 60)).padStart(1, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6155', letterSpacing: 1 }}>TIMER</span>
                </div>
              )}

              <div style={{ width: 2, height: 44, background: '#3a2e22' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, color: '#7fcabf' }}>{game.tealRemaining}</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#2f9c8f', letterSpacing: 1 }}>TEAL</span>
              </div>
            </div>

            {/* turn indicator + room code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {/* room code — always visible */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#120e0a', border: '1px solid #3a2e22', borderRadius: 6, padding: '5px 10px' }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547', letterSpacing: 1 }}>CODE</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#e2a93b', letterSpacing: 3 }}>{lobby.code}</span>
              </div>

              {myRole?.role === 'spectator' && (
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 8, letterSpacing: 1,
                  color: '#8c7c68', background: '#1b1611', border: '1px solid #3a2e22',
                  borderRadius: 5, padding: '5px 10px',
                }}>SPECTATING</div>
              )}

              {!game.winner && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="pulse-dot" style={{
                      width: 9, height: 9, borderRadius: 2,
                      background: turnColor, boxShadow: `0 0 9px ${turnColor}`,
                      display: 'inline-block',
                    }} />
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#f3e9d6' }}>
                      {turnLabel} TO {game.phase === 'giving-clue' ? 'CLUE' : 'GUESS'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#7c7163', letterSpacing: 1 }}>
                    ROUND {String(game.round).padStart(2, '0')} · {
                      myRole?.role === 'spectator' ? 'SPECTATING'
                      : isSpymaster ? 'SPYMASTER'
                      : 'OPERATIVE'
                    } VIEW
                  </span>
                </>
              )}
              <button onClick={handleLeave} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6155',
                border: '1px solid #3a2e22', padding: '7px 10px', borderRadius: 4,
                background: 'none', cursor: 'pointer',
              }}>LEAVE</button>
            </div>
          </div>

          {/* body: rail | board | rail */}
          <div style={{ display: 'flex', gap: 24, paddingTop: 22 }}>
            {/* RUST rail */}
            <TeamRail color="#d65a37" label="RUST" players={rustPlayers} />

            {/* board */}
            <div style={{ flex: 1, background: '#15110c', border: '3px solid #3a2e22', borderRadius: 12, padding: 16, boxShadow: 'inset 0 0 50px rgba(0,0,0,.6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5em', fontSize: 17 }}>
                {game.board.map((card, i) => (
                  <GameCard
                    key={i}
                    card={card}
                    index={i}
                    isSpymaster={isSpymaster}
                    canGuess={canGuess}
                    onGuess={guessCard}
                  />
                ))}
              </div>
            </div>

            {/* TEAL rail */}
            <TeamRail color="#2f9c8f" label="TEAL" players={tealPlayers} />
          </div>

          {/* spectators strip — visible to all players */}
          {(() => { const specs = lobby.players.filter(p => p.role === 'spectator'); return specs.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, padding: '9px 14px', background: '#15110c', border: '1px solid #2c2319', borderRadius: 8 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547', letterSpacing: 1, flexShrink: 0 }}>SPECTATING</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {specs.map(p => (
                  <span key={p.userId} style={{ fontSize: 12, color: '#6b6155', fontWeight: 700 }}>
                    {p.username.toUpperCase()}{p.userId === user.userId ? ' (you)' : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : null; })()}

          {/* clue bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 22, paddingTop: 20, borderTop: '2px solid #2c2319' }}>
            {/* current clue display */}
            {game.activeClue ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68' }}>CLUE</span>
                <span style={{ fontWeight: 700, fontSize: 26, color: '#e2a93b', letterSpacing: 3 }}>{game.activeClue.word}</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#e2a93b' }}>×{game.activeClue.number}</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#5f5547' }}>
                {isMyTurn && isSpymaster ? 'Give your team a clue...' : `Waiting for ${turnLabel} spymaster...`}
              </div>
            )}

            {/* guess dots */}
            {game.activeClue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 11, color: '#7c7163', letterSpacing: 1 }}>GUESSES</span>
                {Array.from({ length: guessDotsCount }).map((_, i) => (
                  <span key={i} style={{
                    width: 11, height: 11, borderRadius: '50%',
                    background: i < game.guessesUsed ? '#e2a93b' : 'transparent',
                    border: i < game.guessesUsed ? 'none' : '2px solid #3a2e22',
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            )}

            {/* spymaster clue input */}
            {canGiveClue && (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #3a2e22', padding: '8px 2px' }}>
                  <input
                    value={clueWord}
                    onChange={e => setClueWord(e.target.value.replace(/\s/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitClue()}
                    placeholder="one word clue…"
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontSize: 13, color: '#f3e9d6', fontFamily: 'Space Mono, monospace',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setClueNumber(n => Math.max(1, n - 1))} style={{ color: '#8c7c68', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>−</button>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#e2a93b', minWidth: 20, textAlign: 'center' }}>{clueNumber}</span>
                    <button onClick={() => setClueNumber(n => Math.min(9, n + 1))} style={{ color: '#8c7c68', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>+</button>
                  </div>
                </div>
                <GoldButton onClick={handleSubmitClue} small style={{ fontSize: 9, padding: '14px 18px' }}>
                  TRANSMIT
                </GoldButton>
              </>
            )}

            {/* end turn button for operatives */}
            {canEndTurn && (
              <GoldButton onClick={endTurn} small style={{ marginLeft: 'auto', fontSize: 9, padding: '14px 18px' }}>
                END TURN
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function TeamRail({ color, label, players }: { color: string; label: string; players: Array<{ username: string; role: string }> }) {
  return (
    <div style={{ width: 158 }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color, letterSpacing: 1, paddingBottom: 12, borderBottom: '2px solid #2c2319' }}>
        {label}
      </div>
      {players.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: '1px solid #241c14' }}>
          <PfpAvatar size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#f3e9d6', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.username.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, color: p.role === 'spymaster' ? '#e2a93b' : '#8c7c68', letterSpacing: 0.5 }}>
              {p.role === 'spymaster' ? '★ SPYMASTER' : 'operative'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const CARD_BRIGHT: Record<string, string> = {
  rust: '#d65a37', teal: '#2f9c8f', neutral: '#c8b489', avoid: '#2b2622', hidden: '#e4d9c4',
};
const CARD_EDGE: Record<string, string> = {
  rust: '#a8421f', teal: '#21766b', neutral: '#a08a5e', avoid: '#141210', hidden: '#c8b99a',
};
const CARD_SUNKEN: Record<string, string> = {
  rust: '#5f2415', teal: '#143f39', neutral: '#4d4330', avoid: '#0e0b08', hidden: '#15110c',
};
const CARD_SUNKEN_EDGE: Record<string, string> = {
  rust: '#3d150b', teal: '#0c2723', neutral: '#332b1d', avoid: '#0a0805', hidden: '#2c2319',
};

function GameCard({ card, index, isSpymaster, canGuess, onGuess }: {
  card: Card;
  index: number;
  isSpymaster: boolean;
  canGuess: boolean;
  onGuess: (i: number) => void;
}) {
  const team = card.team;
  const clickable = canGuess && !card.revealed;

  const faceStyle: React.CSSProperties = card.revealed
    ? {
      background: CARD_SUNKEN[team] ?? '#15110c',
      border: `0.16em solid ${CARD_SUNKEN_EDGE[team] ?? '#2c2319'}`,
      boxShadow: 'inset 0 0.34em 0.7em rgba(0,0,0,.6), inset 0 0 0 0.16em rgba(0,0,0,.25)',
    }
    : {
      background: CARD_BRIGHT[team] ?? '#e4d9c4',
      border: `0.16em solid ${CARD_EDGE[team] ?? '#c8b99a'}`,
      boxShadow: team === 'avoid'
        ? '0 0.22em 0 rgba(0,0,0,.34), inset 0 0 0 0.16em #4a443d'
        : '0 0.22em 0 rgba(0,0,0,.34)',
    };

  const wordColor = card.revealed
    ? 'rgba(247,233,214,.45)'
    : team === 'neutral' ? '#2a2113'
    : team === 'avoid' ? '#f3e9d6'
    : team === 'hidden' ? '#3a2e1a'
    : '#fbeede';

  return (
    <button
      onClick={() => clickable && onGuess(index)}
      disabled={!clickable}
      style={{
        ...faceStyle,
        position: 'relative',
        aspectRatio: '16 / 10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0.3em 0.28em',
        borderRadius: '0.32em',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'opacity 0.1s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      <span style={{
        fontFamily: 'Space Mono, monospace',
        fontWeight: 700,
        fontSize: card.revealed ? '0.84em' : '0.9em',
        letterSpacing: '0.03em',
        lineHeight: 1.05,
        color: wordColor,
        textShadow: (!card.revealed && team !== 'neutral' && team !== 'avoid' && team !== 'hidden')
          ? '0 0.08em 0 rgba(0,0,0,.3)' : 'none',
      }}>
        {card.word}
      </span>
    </button>
  );
}
