import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

const sizes = {
  sm: { fontSize: 14 },
  md: { fontSize: 20 },
  lg: { fontSize: 38 },
};

export function Logo({ size = 'md', inline = true }: LogoProps) {
  const { fontSize } = sizes[size];
  const flexDir = inline ? 'row' : 'column';
  const gap = inline ? 9 : size === 'lg' ? 8 : 6;

  return (
    <div style={{ display: 'flex', flexDirection: flexDir, alignItems: 'baseline', gap }}>
      <span style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize,
        color: '#e2a93b',
        textShadow: '0 3px 0 rgba(0,0,0,.4)',
        lineHeight: 1,
      }}>CODE</span>
      <span style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize,
        color: '#f3e9d6',
        textShadow: '0 3px 0 rgba(0,0,0,.4)',
        lineHeight: 1,
      }}>WORDS</span>
    </div>
  );
}
