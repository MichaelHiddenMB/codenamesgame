import React from 'react';

interface PfpAvatarProps {
  size?: number;
  goldRing?: boolean;
  label?: string;
}

export function PfpAvatar({ size = 38, goldRing = false, label }: PfpAvatarProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'repeating-linear-gradient(45deg, #2c2319 0 5px, #241c14 5px 10px)',
      border: goldRing ? '3px solid #e2a93b' : '1px solid #3a2e22',
      boxShadow: goldRing ? '0 0 0 4px rgba(226,169,59,.14)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.floor(size * 0.25),
      color: '#6b6155',
      fontFamily: 'Space Mono, monospace',
      userSelect: 'none',
    }}>
      {label ?? 'PFP'}
    </div>
  );
}
