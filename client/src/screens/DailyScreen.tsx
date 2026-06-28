import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PfpAvatar } from '../components/PfpAvatar';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';
import { api, DailySessionState, DailyResultData } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoardCard {
  word: string;
}

interface TodayBoard {
  id: number;
  date: string;
  cards: BoardCard[];
  clues: { word: string; number: number }[];
}

type GuessOutcome = 'agent' | 'neutral' | 'avoid';

// ─── Wordle Grid ──────────────────────────────────────────────────────────────

function WordleGrid({ history, totalRounds }: { history: GuessOutcome[][]; totalRounds: number }) {
  const OUTCOME_COLOR: Record<GuessOutcome, string> = {
    agent:   '#2f9c8f',
    neutral: '#5a5044',
    avoid:   '#d65a37',
  };
  const OUTCOME_EMOJI: Record<GuessOutcome, string> = {
    agent: '🟩', neutral: '⬛', avoid: '🟥',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: totalRounds }).map((_, rIdx) => {
        const round = history[rIdx] ?? [];
        return (
          <div key={rIdx} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547', width: 14, textAlign: 'right' }}>
              {rIdx + 1}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {round.length === 0 ? (
                <span style={{ width: 28, height: 28, borderRadius: 4, background: '#1b1611', border: '1px solid #2c2319', display: 'inline-block' }} />
              ) : (
                round.map((outcome, gIdx) => (
                  <span
                    key={gIdx}
                    title={OUTCOME_EMOJI[outcome]}
                    style={{
                      width: 28, height: 28, borderRadius: 4,
                      background: OUTCOME_COLOR[outcome],
                      display: 'inline-block',
                      boxShadow: outcome === 'agent' ? '0 0 8px rgba(47,156,143,.5)' : 'none',
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Result modal (Wordle view for a specific player) ─────────────────────────

function PlayerResultModal({ username, date, onClose }: { username: string; date: string; onClose: () => void }) {
  const [result, setResult] = useState<DailyResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dailyResultByUsername(username).then(r => { setResult(r.result); setLoading(false); }).catch(() => setLoading(false));
  }, [username]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(8,6,4,.88)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1b1611', border: '2px solid #3a2e22', borderRadius: 14,
          padding: '32px 36px', minWidth: 300, maxWidth: 460,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {result && <PfpAvatar size={38} avatarId={result.equippedAvatarId} />}
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#f3e9d6' }}>
              {username.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: '#8c7c68', marginTop: 4 }}>{date}</div>
          </div>
        </div>

        {loading && <div style={{ fontSize: 12, color: '#8c7c68' }}>Loading…</div>}

        {!loading && result && (
          <>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', marginBottom: 6 }}>STATUS</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: result.solved ? '#2f9c8f' : '#d65a37' }}>
                  {result.solved ? 'SOLVED' : 'FAILED'}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', marginBottom: 6 }}>GUESSES</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#e2a93b' }}>{result.totalGuesses}</div>
              </div>
            </div>
            <WordleGrid history={result.guessHistory} totalRounds={4} />
            <div style={{ marginTop: 16, display: 'flex', gap: 14, fontSize: 11, color: '#6b6155' }}>
              <span><span style={{ color: '#2f9c8f' }}>■</span> agent</span>
              <span><span style={{ color: '#5a5044' }}>■</span> neutral</span>
              <span><span style={{ color: '#d65a37' }}>■</span> avoid</span>
            </div>
          </>
        )}

        {!loading && !result && (
          <div style={{ fontSize: 12, color: '#8c7c68' }}>No result found for today.</div>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 24, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#6b6155', background: 'none', border: '1px solid #3a2e22', borderRadius: 6, padding: '10px 18px', cursor: 'pointer' }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ date, myResult }: { date: string; myResult: DailyResultData | null }) {
  const [fetchedResults, setFetchedResults] = useState<DailyResultData[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const r = await api.dailyLeaderboard();
      setFetchedResults(r.results);
    } catch { /* ignore */ } finally {
      if (showSpinner) setRefreshing(false);
      setLoadingBoard(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setLoadingBoard(true);
    fetchLeaderboard();
  }, [date, fetchLeaderboard]);

  // Auto-refresh every 30 seconds so new completers appear without a page reload
  useEffect(() => {
    const id = setInterval(() => fetchLeaderboard(), 30_000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  // Always show the current player — merges into fetched list so they appear
  // even if the leaderboard API races ahead of the DB write.
  const displayResults = React.useMemo(() => {
    if (!myResult) return fetchedResults;
    const alreadyIn = fetchedResults.some(r => r.userId === myResult.userId);
    if (alreadyIn) return fetchedResults;
    return [...fetchedResults, myResult].sort((a, b) => {
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      if (a.totalGuesses !== b.totalGuesses) return a.totalGuesses - b.totalGuesses;
      return a.completedAt < b.completedAt ? -1 : 1;
    });
  }, [fetchedResults, myResult]);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#e2a93b', letterSpacing: 2 }}>
          TODAY'S LEADERBOARD
        </div>
        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing || loadingBoard}
          style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 7,
            color: refreshing ? '#5f5547' : '#8c7c68',
            background: 'none', border: '1px solid #2c2319', borderRadius: 5,
            padding: '5px 10px', cursor: refreshing ? 'default' : 'pointer',
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          {refreshing ? '...' : '↺'}
        </button>
      </div>

      {loadingBoard && (
        <div style={{ fontSize: 12, color: '#5f5547' }}>Loading...</div>
      )}

      {!loadingBoard && displayResults.length === 0 && (
        <div style={{ fontSize: 13, color: '#5f5547' }}>No solves yet today.</div>
      )}

      {displayResults.map((r, idx) => (
        <div
          key={r.id}
          onClick={() => setSelected(r.username)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 14px', marginBottom: 6,
            background: myResult?.userId === r.userId ? '#1f1a13' : '#15110c',
            border: `1px solid ${myResult?.userId === r.userId ? '#4a3e30' : '#2c2319'}`,
            borderRadius: 8, cursor: 'pointer',
            transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, width: 22, textAlign: 'right',
            color: !r.solved ? '#3a2e22' : idx === 0 ? '#e2a93b' : '#5f5547' }}>
            {r.solved ? `#${displayResults.filter(x => x.solved).indexOf(r) + 1}` : '—'}
          </div>
          <PfpAvatar size={30} avatarId={r.equippedAvatarId} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#f3e9d6', fontWeight: 700 }}>{r.username.toUpperCase()}</div>
            <WordleGrid history={r.guessHistory} totalRounds={4} />
          </div>
          <div style={{ textAlign: 'right' }}>
            {r.solved ? (
              <>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#e2a93b' }}>{r.totalGuesses}</div>
                <div style={{ fontSize: 10, color: '#5f5547' }}>guess{r.totalGuesses !== 1 ? 'es' : ''}</div>
              </>
            ) : (
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#d65a37' }}>FAILED</div>
            )}
          </div>
        </div>
      ))}

      {selected && (
        <PlayerResultModal username={selected} date={date} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ─── Card colors ──────────────────────────────────────────────────────────────

const REVEAL_BG: Record<string, string> = {
  agent: '#143f39', neutral: '#4d4330', avoid: '#3d150b',
};
const REVEAL_BORDER: Record<string, string> = {
  agent: '#2f9c8f', neutral: '#8c7c68', avoid: '#d65a37',
};

// ─── Main DailyScreen ─────────────────────────────────────────────────────────

export function DailyScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [session, setSession] = useState<DailySessionState | null>(null);
  const [myResult, setMyResult] = useState<DailyResultData | null>(null);
  const [screenMode, setScreenMode] = useState<'loading' | 'no-board' | 'game' | 'done'>('loading');
  const [revealedBoard, setRevealedBoard] = useState<{ word: string; type: 'agent' | 'neutral' | 'avoid' }[] | null>(null);
  const [revealedClues, setRevealedClues] = useState<{ word: string; number: number }[] | null>(null);

  // local reveal state (mirrors session.revealedCards but used for animation)
  const [pendingIdx, setPendingIdx] = useState<number | null>(null); // first click
  const [lastOutcome, setLastOutcome] = useState<{ cardIndex: number; outcome: GuessOutcome } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a map of revealed card outcomes from the session
  const revealMap = React.useMemo(() => {
    const m = new Map<number, GuessOutcome>();
    session?.revealedCards.forEach(rc => m.set(rc.index, rc.type));
    return m;
  }, [session?.revealedCards]);

  const initScreen = useCallback(async () => {
    try {
      const [todayRes, sessionRes] = await Promise.all([api.dailyToday(), api.dailySession()]);
      if (!todayRes.board) { setScreenMode('no-board'); setLoading(false); return; }
      setBoard(todayRes.board);

      if (sessionRes.status === 'won' || sessionRes.status === 'lost') {
        setMyResult(sessionRes.result ?? null);
        setScreenMode('done');
        fetchReveal();
      } else if (sessionRes.status === 'in-progress' && sessionRes.session) {
        setSession(sessionRes.session);
        setScreenMode('game');
      } else {
        setScreenMode('game'); // will show start button
      }
    } catch {
      setError('Failed to load today\'s puzzle.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initScreen(); }, [initScreen]);

  const fetchReveal = useCallback(async () => {
    try {
      const r = await api.dailyReveal();
      setRevealedBoard(r.cards);
      setRevealedClues(r.clues);
    } catch { /* ignore — gated on completion server-side */ }
  }, []);

  const handleStart = async () => {
    setBusy(true);
    try {
      const r = await api.dailyStart();
      setSession(r.session);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  };

  const handleCardClick = async (idx: number) => {
    if (busy || !session || session.status !== 'in-progress') return;
    if (revealMap.has(idx)) return;

    if (pendingIdx === null) {
      // First click — select
      setPendingIdx(idx);
      return;
    }
    if (pendingIdx === idx) {
      // Second click on same card — confirm guess
      setPendingIdx(null);
      setBusy(true);
      try {
        const r = await api.dailyGuess(idx);
        setLastOutcome({ cardIndex: r.cardIndex, outcome: r.outcome });
        if (r.gameOver) {
          const sessionRes = await api.dailySession();
          setMyResult(sessionRes.result ?? null);
          setSession(null);
          setScreenMode('done');
          fetchReveal();
        } else {
          setSession(r.session!);
        }
      } catch (e: any) { setError(e.message); }
      setBusy(false);
    } else {
      // Click on different card — switch selection
      setPendingIdx(idx);
    }
  };

  const handlePass = async () => {
    if (busy || !session) return;
    setBusy(true);
    try {
      const r = await api.dailyPass();
      if (r.gameOver) {
        const sessionRes = await api.dailySession();
        setMyResult(sessionRes.result ?? null);
        setSession(null);
        setScreenMode('done');
        fetchReveal();
      } else {
        setSession(r.session!);
        setPendingIdx(null);
      }
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0b08' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#e2a93b' }}>LOADING...</span>
      </div>
    );
  }

  const date = board?.date ?? new Date().toISOString().split('T')[0];

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b08', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 20px 40px' }}>
        <div style={{
          width: '100%', maxWidth: 820,
          background: '#1b1611', borderRadius: 14,
          border: '2px solid #3a2e22',
          boxShadow: '0 22px 60px rgba(0,0,0,.5)',
          padding: '28px 32px 36px',
          fontFamily: 'Space Mono, monospace',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '2px solid #2c2319' }}>
            <Logo size="md" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#e2a93b', letterSpacing: 2 }}>DAILY</div>
              <div style={{ fontSize: 11, color: '#5f5547', marginTop: 4 }}>{date}</div>
            </div>
            <button onClick={() => navigate('/')} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6155', background: 'none', border: '1px solid #3a2e22', borderRadius: 5, padding: '8px 12px', cursor: 'pointer' }}>
              HOME
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#3d150b', border: '1px solid #d65a37', borderRadius: 6, fontSize: 12, color: '#f3e9d6' }}>
              {error}
            </div>
          )}

          {/* No board today */}
          {screenMode === 'no-board' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#5f5547', lineHeight: 2 }}>
                NO PUZZLE TODAY
              </div>
              <div style={{ fontSize: 12, color: '#6b6155', marginTop: 12 }}>Check back tomorrow.</div>
            </div>
          )}

          {/* Game screen */}
          {screenMode === 'game' && board && (
            <>
              {/* Round progress */}
              {session && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 20, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Array.from({ length: session.totalRounds }).map((_, i) => (
                      <div key={i} style={{
                        width: 32, height: 6, borderRadius: 3,
                        background: i < session.currentRound ? '#2f9c8f'
                          : i === session.currentRound ? '#e2a93b'
                          : '#2c2319',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68' }}>
                    ROUND {session.currentRound + 1}/{session.totalRounds}
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#2f9c8f', marginLeft: 'auto' }}>
                    {session.agentsFound}/{session.totalAgents} AGENTS
                  </span>
                </div>
              )}

              {/* Clue bar */}
              {session?.clue ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 20,
                  padding: '14px 18px', background: '#15110c',
                  border: '2px solid #4a3e30', borderRadius: 10,
                }}>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68' }}>CLUE</span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: '#e2a93b', letterSpacing: 3 }}>
                    {session.clue.word}
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#e2a93b' }}>×{session.clue.number}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                    {Array.from({ length: session.maxGuessesThisRound }).map((_, i) => (
                      <span key={i} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: i < session.guessesThisRound ? '#2f9c8f' : '#2c2319',
                        display: 'inline-block',
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={handlePass}
                    disabled={busy}
                    style={{
                      fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6155',
                      background: 'none', border: '1px solid #3a2e22', borderRadius: 5,
                      padding: '7px 12px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1,
                    }}
                  >
                    PASS
                  </button>
                </div>
              ) : !session ? (
                <div style={{ marginTop: 24, marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#8c7c68', marginBottom: 18 }}>
                    Find all 5 agents using the pre-determined clues. You have 4 rounds.
                  </div>
                  <GoldButton onClick={handleStart} disabled={busy}>
                    START PUZZLE
                  </GoldButton>
                </div>
              ) : null}

              {/* Click hint */}
              {session && pendingIdx === null && (
                <div style={{ fontSize: 11, color: '#5f5547', marginBottom: 10 }}>
                  Click a card to select, click again to confirm.
                </div>
              )}
              {session && pendingIdx !== null && (
                <div style={{ fontSize: 11, color: '#e2a93b', marginBottom: 10 }}>
                  Click the highlighted card again to confirm, or click another to switch.
                </div>
              )}

              {/* 3×4 Board */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10, background: '#15110c',
                border: '3px solid #3a2e22', borderRadius: 12,
                padding: 14, boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)',
              }}>
                {board.cards.map((card, i) => {
                  const revealed = revealMap.get(i);
                  const isPending = pendingIdx === i;
                  const clickable = !!session && !revealed && !busy;

                  return (
                    <button
                      key={i}
                      onClick={() => handleCardClick(i)}
                      disabled={!clickable}
                      style={{
                        aspectRatio: '16/10',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '0.3em 0.4em',
                        borderRadius: 8, cursor: clickable ? 'pointer' : 'default',
                        fontFamily: 'Space Mono, monospace', fontWeight: 700,
                        fontSize: 14, letterSpacing: '0.03em',
                        transition: 'box-shadow 0.1s, border-color 0.1s, background 0.15s',
                        ...(revealed ? {
                          background: REVEAL_BG[revealed] ?? '#15110c',
                          border: `2px solid ${REVEAL_BORDER[revealed] ?? '#2c2319'}`,
                          color: 'rgba(243,233,214,.5)',
                          boxShadow: revealed === 'agent' ? '0 0 12px rgba(47,156,143,.35)' : 'none',
                        } : isPending ? {
                          background: '#2a2012',
                          border: '2px solid #e2a93b',
                          color: '#f3e9d6',
                          boxShadow: '0 0 0 2px rgba(226,169,59,.4)',
                        } : {
                          background: '#e4d9c4',
                          border: '2px solid #c8b99a',
                          color: '#3a2e1a',
                          boxShadow: '0 3px 0 rgba(0,0,0,.35)',
                        }),
                      }}
                    >
                      {card.word}
                    </button>
                  );
                })}
              </div>

              {/* Round history */}
              {session && session.history.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547', marginBottom: 10 }}>HISTORY</div>
                  <WordleGrid history={session.history} totalRounds={session.totalRounds} />
                </div>
              )}
            </>
          )}

          {/* Done screen — shows result + leaderboard */}
          {screenMode === 'done' && (
            <>
              <div style={{ marginTop: 28, textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 'clamp(18px, 4vw, 36px)',
                  color: myResult?.solved ? '#2f9c8f' : '#d65a37',
                  textShadow: myResult?.solved ? '0 0 30px rgba(47,156,143,.4)' : '0 0 30px rgba(214,90,55,.4)',
                  lineHeight: 1.4, marginBottom: 16,
                }}>
                  {myResult?.solved ? 'SOLVED!' : 'BETTER LUCK TOMORROW'}
                </div>

                {myResult && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', marginBottom: 6 }}>GUESSES</div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#e2a93b' }}>{myResult.totalGuesses}</div>
                    </div>
                    <div style={{ width: 1, background: '#2c2319' }} />
                    <div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', marginBottom: 6 }}>YOUR GRID</div>
                      <WordleGrid history={myResult.guessHistory} totalRounds={4} />
                    </div>
                  </div>
                )}
              </div>

              {/* Revealed board */}
              {revealedBoard && (
                <div style={{ borderTop: '2px solid #2c2319', paddingTop: 24, marginTop: 8 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#8c7c68', letterSpacing: 2, marginBottom: 14 }}>
                    TODAY'S BOARD
                  </div>

                  {/* Clues legend */}
                  {revealedClues && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                      {revealedClues.map((clue, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px', background: '#15110c',
                          border: '1px solid #3a2e22', borderRadius: 6,
                        }}>
                          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5f5547' }}>R{i + 1}</span>
                          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#e2a93b' }}>{clue.word}</span>
                          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8c7c68' }}>×{clue.number}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8, background: '#15110c',
                    border: '3px solid #3a2e22', borderRadius: 12,
                    padding: 12, boxShadow: 'inset 0 0 30px rgba(0,0,0,.4)',
                  }}>
                    {revealedBoard.map((card, i) => (
                      <div key={i} style={{
                        aspectRatio: '16/10',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '0.3em 0.5em',
                        borderRadius: 8,
                        fontFamily: 'Space Mono, monospace', fontWeight: 700,
                        fontSize: 13, letterSpacing: '0.03em',
                        ...(card.type === 'agent' ? {
                          background: '#143f39',
                          border: '2px solid #2f9c8f',
                          color: '#7fcabf',
                          boxShadow: '0 0 10px rgba(47,156,143,.25)',
                        } : card.type === 'avoid' ? {
                          background: '#3d150b',
                          border: '2px solid #d65a37',
                          color: '#f0a58a',
                          boxShadow: '0 0 10px rgba(214,90,55,.25)',
                        } : {
                          background: '#2a2113',
                          border: '2px solid #5a4e3a',
                          color: '#a4927a',
                        }),
                      }}>
                        {card.word}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 11, color: '#5f5547' }}>
                    <span><span style={{ color: '#2f9c8f' }}>■</span> agent</span>
                    <span><span style={{ color: '#5a5044' }}>■</span> neutral</span>
                    <span><span style={{ color: '#d65a37' }}>■</span> avoid</span>
                  </div>
                </div>
              )}

              <div style={{ borderTop: '2px solid #2c2319', paddingTop: 24, marginTop: 24 }}>
                <Leaderboard date={date} myResult={myResult} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
