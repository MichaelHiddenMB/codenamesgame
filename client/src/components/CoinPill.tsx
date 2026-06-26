import React from 'react';
import { PixelCoin } from './PixelIcons';

export function CoinPill({ coins, size = 'md' }: { coins: number; size?: 'sm' | 'md' }) {
  const coinSize = size === 'sm' ? 16 : 20;
  const fontSize = size === 'sm' ? 11 : 14;
  const pad = size === 'sm' ? '7px 12px 7px 8px' : '9px 18px 9px 12px';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 9,
      background: '#221a14', border: '2px solid #3a2e22',
      borderRadius: 999, padding: pad,
    }}>
      <PixelCoin size={coinSize} />
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize, color: '#e2a93b' }}>
        {coins.toLocaleString()}
      </span>
    </div>
  );
}
