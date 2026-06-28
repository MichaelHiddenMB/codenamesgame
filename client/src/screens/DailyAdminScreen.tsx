import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';
import { api, AdminDailyBoard } from '../api';

type CardType = 'agent' | 'neutral' | 'avoid';

interface CardDraft {
  word: string;
  type: CardType;
}

interface ClueDraft {
  word: string;
  number: number;
}

const BLANK_CARDS: CardDraft[] = Array.from({ length: 12 }, () => ({ word: '', type: 'neutral' }));
const BLANK_CLUES: ClueDraft[] = Array.from({ length: 4 }, () => ({ word: '', number: 1 }));

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Board list item ──────────────────────────────────────────────────────────

function BoardRow({ board, onEdit, onDelete, onReset }: { board: AdminDailyBoard; onEdit: () => void; onDelete: () => void; onReset: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px', marginBottom: 6,
      background: '#15110c', border: '1px solid #2c2319', borderRadius: 8,
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#e2a93b', minWidth: 96 }}>
        {board.date}
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {board.cards.map((c, i) => (
          <span key={i} style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: c.type === 'agent' ? '#143f39' : c.type === 'avoid' ? '#3d150b' : '#1b1611',
            color: c.type === 'agent' ? '#2f9c8f' : c.type === 'avoid' ? '#d65a37' : '#8c7c68',
            border: `1px solid ${c.type === 'agent' ? '#2f9c8f' : c.type === 'avoid' ? '#d65a37' : '#3a2e22'}`,
          }}>
            {c.word}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#e2a93b', background: 'none', border: '1px solid #4a3e30', borderRadius: 5, padding: '7px 12px', cursor: 'pointer' }}>
          EDIT
        </button>
        <button onClick={onReset} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#9c6fcf', background: 'none', border: '1px solid #4a3070', borderRadius: 5, padding: '7px 12px', cursor: 'pointer' }}>
          RESET
        </button>
        <button onClick={onDelete} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#d65a37', background: 'none', border: '1px solid #5a2020', borderRadius: 5, padding: '7px 12px', cursor: 'pointer' }}>
          DEL
        </button>
      </div>
    </div>
  );
}

// ─── Board editor form ────────────────────────────────────────────────────────

function BoardEditor({
  initial,
  onSave,
  onCancel,
  busy,
  error,
}: {
  initial?: AdminDailyBoard;
  onSave: (date: string, cards: CardDraft[], clues: ClueDraft[]) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [date, setDate] = useState(initial?.date ?? today());
  const [cards, setCards] = useState<CardDraft[]>(
    initial?.cards.map(c => ({ word: c.word, type: c.type })) ?? BLANK_CARDS.map(c => ({ ...c }))
  );
  const [clues, setClues] = useState<ClueDraft[]>(
    initial?.clues.map(c => ({ word: c.word, number: c.number })) ?? BLANK_CLUES.map(c => ({ ...c }))
  );

  const agentCount = cards.filter(c => c.type === 'agent').length;
  const avoidCount = cards.filter(c => c.type === 'avoid').length;

  const updateCard = (i: number, field: keyof CardDraft, value: string) => {
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const updateClue = (i: number, field: keyof ClueDraft, value: string | number) => {
    setClues(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const validClues = clues.filter(c => c.word.trim() !== '');
  const canSave = date && agentCount === 5 && avoidCount === 1 && validClues.length >= 1 && cards.every(c => c.word.trim() !== '');

  const TYPE_COLOR: Record<CardType, string> = {
    agent: '#2f9c8f', neutral: '#8c7c68', avoid: '#d65a37',
  };

  return (
    <div style={{
      background: '#15110c', border: '2px solid #3a2e22', borderRadius: 12,
      padding: '24px 28px', marginTop: 20,
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#f3e9d6', marginBottom: 20 }}>
        {initial ? 'EDIT BOARD' : 'NEW BOARD'}
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#3d150b', border: '1px solid #d65a37', borderRadius: 6, fontSize: 12, color: '#f3e9d6' }}>
          {error}
        </div>
      )}

      {/* Date */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', display: 'block', marginBottom: 8 }}>DATE</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            background: '#1b1611', border: '1px solid #3a2e22', borderRadius: 6,
            color: '#f3e9d6', fontFamily: 'Space Mono, monospace', fontSize: 13,
            padding: '8px 12px', outline: 'none',
          }}
        />
      </div>

      {/* Cards 3×4 grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68' }}>CARDS (3×4)</label>
          <span style={{ fontSize: 11, color: agentCount === 5 ? '#2f9c8f' : '#d65a37' }}>agents: {agentCount}/5</span>
          <span style={{ fontSize: 11, color: avoidCount === 1 ? '#e2a93b' : '#d65a37' }}>avoid: {avoidCount}/1</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                value={card.word}
                onChange={e => updateCard(i, 'word', e.target.value.toUpperCase())}
                placeholder={`WORD ${i + 1}`}
                style={{
                  background: '#1b1611', border: `1px solid ${TYPE_COLOR[card.type]}`,
                  borderRadius: 5, color: '#f3e9d6', fontFamily: 'Space Mono, monospace',
                  fontSize: 11, padding: '6px 8px', outline: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <select
                value={card.type}
                onChange={e => updateCard(i, 'type', e.target.value)}
                style={{
                  background: '#1b1611', border: `1px solid ${TYPE_COLOR[card.type]}`,
                  borderRadius: 5, color: TYPE_COLOR[card.type],
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  padding: '4px 6px', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="neutral">neutral</option>
                <option value="agent">agent</option>
                <option value="avoid">avoid</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Clues */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', display: 'block', marginBottom: 10 }}>
          CLUES (1–4, in order)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clues.map((clue, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#5f5547', width: 16 }}>{i + 1}</span>
              <input
                value={clue.word}
                onChange={e => updateClue(i, 'word', e.target.value.toUpperCase())}
                placeholder="CLUE WORD"
                style={{
                  flex: 1, background: '#1b1611', border: '1px solid #3a2e22', borderRadius: 5,
                  color: '#f3e9d6', fontFamily: 'Space Mono, monospace', fontSize: 12,
                  padding: '7px 10px', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => updateClue(i, 'number', Math.max(1, clue.number - 1))} style={{ color: '#8c7c68', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>−</button>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#e2a93b', minWidth: 20, textAlign: 'center' }}>{clue.number}</span>
                <button onClick={() => updateClue(i, 'number', Math.min(5, clue.number + 1))} style={{ color: '#8c7c68', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <GoldButton
          onClick={() => onSave(date, cards, validClues)}
          disabled={!canSave || busy}
        >
          {busy ? 'SAVING...' : 'SAVE BOARD'}
        </GoldButton>
        <button
          onClick={onCancel}
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#6b6155', background: 'none', border: '1px solid #3a2e22', borderRadius: 6, padding: '12px 18px', cursor: 'pointer' }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DailyAdminScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [boards, setBoards] = useState<AdminDailyBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminDailyBoard | null | 'new'>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.username.toLowerCase() !== 'hiddenmb') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadBoards = async () => {
    try {
      const r = await api.adminDailyBoards();
      setBoards(r.boards);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadBoards(); }, []);

  const handleSave = async (date: string, cards: CardDraft[], clues: ClueDraft[]) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        date,
        cards: cards.map(c => ({ word: c.word.trim(), type: c.type })),
        clues: clues.filter(c => c.word.trim()).map(c => ({ word: c.word.trim(), number: c.number })),
      };
      if (editing && editing !== 'new') {
        await api.adminUpdateDailyBoard(editing.id, payload);
      } else {
        await api.adminCreateDailyBoard(payload);
      }
      setEditing(null);
      await loadBoards();
    } catch (e: any) {
      setFormError(e.message);
    }
    setBusy(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this board?')) return;
    try {
      await api.adminDeleteDailyBoard(id);
      setBoards(prev => prev.filter(b => b.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const handleReset = async (date: string) => {
    if (!window.confirm(`Reset ALL scores for ${date}? Players will be able to play again.`)) return;
    try {
      const r = await api.adminResetDailyResults(date);
      alert(`Cleared ${r.cleared} result${r.cleared !== 1 ? 's' : ''}.`);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0b08' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#e2a93b' }}>LOADING...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b08', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 20px 40px' }}>
        <div style={{
          width: '100%', maxWidth: 960,
          background: '#1b1611', borderRadius: 14,
          border: '2px solid #3a2e22',
          boxShadow: '0 22px 60px rgba(0,0,0,.5)',
          padding: '28px 32px 36px',
          fontFamily: 'Space Mono, monospace',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '2px solid #2c2319' }}>
            <Logo size="md" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#e2a93b', letterSpacing: 2 }}>DAILY ADMIN</div>
              <div style={{ fontSize: 11, color: '#5f5547', marginTop: 4 }}>hiddenmb access only</div>
            </div>
            <button onClick={() => navigate('/')} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6155', background: 'none', border: '1px solid #3a2e22', borderRadius: 5, padding: '8px 12px', cursor: 'pointer' }}>
              HOME
            </button>
          </div>

          {/* Board list */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f3e9d6' }}>
                BOARDS ({boards.length})
              </div>
              {editing === null && (
                <GoldButton small onClick={() => { setEditing('new'); setFormError(null); }}>
                  + NEW BOARD
                </GoldButton>
              )}
            </div>

            {boards.length === 0 && editing === null && (
              <div style={{ fontSize: 13, color: '#5f5547', padding: '24px 0' }}>
                No boards yet. Create one above.
              </div>
            )}

            {boards.map(board => (
              <BoardRow
                key={board.id}
                board={board}
                onEdit={() => { setEditing(board); setFormError(null); }}
                onDelete={() => handleDelete(board.id)}
                onReset={() => handleReset(board.date)}
              />
            ))}
          </div>

          {/* Editor */}
          {editing !== null && (
            <BoardEditor
              initial={editing === 'new' ? undefined : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              busy={busy}
              error={formError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
