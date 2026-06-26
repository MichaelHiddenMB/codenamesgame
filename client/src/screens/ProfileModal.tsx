import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PfpAvatar } from '../components/PfpAvatar';
import { CoinPill } from '../components/CoinPill';
import { GoldButton } from '../components/GoldButton';
import { api } from '../api';
import { AvatarItem } from '../types';
import { useAuth } from '../context/AuthContext';

export function ProfileModal({ onClose, onEquip }: { onClose: () => void; onEquip?: (avatarId: number) => void }) {
  const navigate = useNavigate();
  const { user, updateEquipped } = useAuth();
  const [ownedAvatars, setOwnedAvatars] = useState<AvatarItem[]>([]);
  const [selectedId, setSelectedId] = useState<number>(user?.equippedAvatarId ?? 1);

  useEffect(() => {
    api.shop().then(res => {
      setOwnedAvatars(res.items.filter(it => it.owned || it.equipped));
      setSelectedId(res.equippedAvatarId);
    });
  }, []);

  const selectedAvatar = ownedAvatars.find(a => a.id === selectedId);

  const handleEquip = async () => {
    if (!selectedAvatar || selectedAvatar.equipped) { onClose(); return; }
    await api.equipAvatar(selectedId);
    updateEquipped(selectedId);
    setOwnedAvatars(prev => prev.map(a => ({ ...a, equipped: a.id === selectedId })));
    onEquip?.(selectedId);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,6,4,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1b1611', borderRadius: 14,
        border: '2px solid #3a2e22',
        boxShadow: '0 22px 60px rgba(0,0,0,.6)',
        overflow: 'hidden', width: '100%', maxWidth: 680,
        fontFamily: 'Space Mono, monospace',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '2px solid #2c2319' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#f3e9d6', letterSpacing: 1 }}>PROFILE</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: '#8c7c68',
            border: '2px solid #3a2e22', borderRadius: 6, cursor: 'pointer', background: 'none',
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 26, padding: '26px 22px' }}>
          {/* left: identity */}
          <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <PfpAvatar size={148} goldRing />
            <div style={{ marginTop: 18, fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#f3e9d6' }}>
              {user?.username.toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 11 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9c8f', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#8c7c68' }}>online</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <CoinPill coins={user?.coins ?? 0} size="sm" />
            </div>
          </div>

          {/* right: owned avatars */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#8c7c68', letterSpacing: 1 }}>YOUR AVATARS</span>
              <button onClick={() => { onClose(); navigate('/shop'); }} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#e2a93b',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>+ GET MORE</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 13 }}>
              {ownedAvatars.map(avatar => (
                <button key={avatar.id} onClick={() => setSelectedId(avatar.id)} style={{
                  position: 'relative', background: '#15110c',
                  border: `2px solid ${selectedId === avatar.id ? '#e2a93b' : '#3a2e22'}`,
                  boxShadow: selectedId === avatar.id ? '0 0 0 3px rgba(226,169,59,.14)' : 'none',
                  borderRadius: 10, padding: 8, cursor: 'pointer',
                }}>
                  <div style={{ aspectRatio: '1/1', borderRadius: 8, background: 'repeating-linear-gradient(45deg, #241c14 0 7px, #1f1810 7px 14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#6b6155' }}>PFP</div>
                  <div style={{ marginTop: 8, fontSize: 11, textAlign: 'center', fontWeight: 700, color: selectedId === avatar.id ? '#e2a93b' : '#a4927a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {avatar.name}
                  </div>
                  {selectedId === avatar.id && (
                    <span style={{
                      position: 'absolute', top: 7, right: 7,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#e2a93b', color: '#1b1611',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</span>
                  )}
                </button>
              ))}

              {/* get more tile */}
              <button onClick={() => { onClose(); navigate('/shop'); }} style={{
                border: '2px dashed #3a2e22', borderRadius: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '14px 6px', cursor: 'pointer',
                background: 'none', minHeight: 104,
              }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: '#5f5547' }}>+</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#8c7c68' }}>SHOP</span>
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', borderTop: '2px solid #2c2319' }}>
          <span style={{ fontSize: 13, color: '#a4927a' }}>
            Selected: <span style={{ color: '#f3e9d6', fontWeight: 700 }}>{selectedAvatar?.name ?? '—'}</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <GoldButton secondary onClick={onClose} small>CANCEL</GoldButton>
            <GoldButton onClick={handleEquip} small>EQUIP</GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
}
