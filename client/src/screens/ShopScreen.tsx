import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoinPill } from '../components/CoinPill';
import { PixelPadlock } from '../components/PixelIcons';
import { GoldButton } from '../components/GoldButton';
import { api } from '../api';
import { AvatarItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { avatarUrls } from '../avatarMap';

type Filter = 'ALL' | 'OWNED' | 'LOCKED';

export function ShopScreen() {
  const navigate = useNavigate();
  const { user, updateCoins, updateEquipped } = useAuth();
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [coins, setCoins] = useState(user?.coins ?? 0);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    api.shop().then(res => {
      setItems(res.items);
      setCoins(res.coins);
    });
  }, []);

  const filteredItems = items.filter(it => {
    if (filter === 'OWNED') return it.owned || it.equipped;
    if (filter === 'LOCKED') return !it.owned && !it.equipped;
    return true;
  });

  const handleBuy = async (item: AvatarItem) => {
    if (buying) return;
    setBuying(item.id);
    try {
      const res = await api.buyAvatar(item.id);
      setCoins(res.coins);
      updateCoins(res.coins);
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, owned: true } : it));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBuying(null);
    }
  };

  const handleEquip = async (item: AvatarItem) => {
    try {
      await api.equipAvatar(item.id);
      updateEquipped(item.id);
      setItems(prev => prev.map(it => ({ ...it, equipped: it.id === item.id })));
    } catch (e: any) {
      alert(e.message);
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate('/')} style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f3e9d6',
              border: '2px solid #3a2e22', padding: '11px 14px', borderRadius: 4,
              background: 'none', cursor: 'pointer',
            }}>← BACK</button>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#e2a93b', textShadow: '0 3px 0 rgba(0,0,0,.4)' }}>SHOP</span>
          </div>
          <CoinPill coins={coins} />
        </div>

        {/* title row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: '#f3e9d6', lineHeight: 1.4 }}>Avatars</h1>
            <p style={{ margin: '11px 0 0', fontSize: 13, color: '#a4927a' }}>Spend the coins you earn from playing on new profile looks.</p>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            {(['ALL', 'OWNED', 'LOCKED'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                color: filter === f ? '#1b1611' : '#8c7c68',
                background: filter === f ? '#e2a93b' : '#15110c',
                border: `2px solid ${filter === f ? '#e2a93b' : '#3a2e22'}`,
                padding: filter === f ? '11px 13px' : '9px 13px',
                borderRadius: 6, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginTop: 24 }}>
          {filteredItems.map(item => (
            <AvatarCard
              key={item.id}
              item={item}
              userCoins={coins}
              buying={buying === item.id}
              onBuy={() => handleBuy(item)}
              onEquip={() => handleEquip(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AvatarCard({ item, userCoins, buying, onBuy, onEquip }: {
  item: AvatarItem;
  userCoins: number;
  buying: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const locked = !item.owned && !item.equipped;
  const canAfford = userCoins >= item.price;

  return (
    <div style={{
      background: '#15110c',
      border: `2px solid ${item.equipped ? '#2f9c8f' : '#3a2e22'}`,
      borderRadius: 12, overflow: 'hidden',
      cursor: 'pointer', display: 'flex', flexDirection: 'column',
    }}
      onClick={() => {
        if (item.equipped) return;
        if (item.owned) onEquip();
        else if (canAfford) onBuy();
      }}
    >
      {/* thumbnail */}
      <div style={{
        position: 'relative', aspectRatio: '1/1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'repeating-linear-gradient(45deg, #241c14 0 7px, #1f1810 7px 14px)',
        borderBottom: '2px solid #2c2319',
        filter: locked ? 'grayscale(1) brightness(.7)' : 'none',
      }}>
        <img src={avatarUrls[item.id]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {item.equipped && (
          <span style={{
            position: 'absolute', top: 7, left: 7,
            fontFamily: "'Press Start 2P', monospace", fontSize: 6,
            color: '#1b1611', background: '#2f9c8f',
            padding: '4px 6px', borderRadius: 4,
          }}>EQUIPPED</span>
        )}
        {locked && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 24, height: 24, borderRadius: 6,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(12,9,7,.82)', border: '1px solid #3a2e22',
          }}>
            <PixelPadlock size={13} />
          </span>
        )}
      </div>

      {/* info */}
      <div style={{ padding: '11px 12px 13px' }}>
        <div style={{ fontSize: 13, color: '#f3e9d6', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ marginTop: 8, fontFamily: "'Press Start 2P', monospace", fontSize: 9, letterSpacing: 0.5, color: item.equipped ? '#2f9c8f' : item.owned ? '#8c7c68' : '#e2a93b' }}>
          {item.equipped ? 'Equipped' : item.owned ? 'Tap to equip' : `◉ ${item.price.toLocaleString()}`}
        </div>
        {locked && !canAfford && (
          <div style={{ marginTop: 4, fontSize: 9, color: '#5f5547' }}>need {(item.price - userCoins).toLocaleString()} more</div>
        )}
      </div>
    </div>
  );
}
