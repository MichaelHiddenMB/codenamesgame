import React from 'react';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  secondary?: boolean;
  small?: boolean;
}

export function GoldButton({ children, secondary, small, style, ...props }: GoldButtonProps) {
  const base: React.CSSProperties = {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: small ? 9 : 11,
    letterSpacing: '0.5px',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 60ms, box-shadow 60ms',
    userSelect: 'none',
    ...style,
  };

  const goldStyle: React.CSSProperties = {
    ...base,
    color: '#1b1611',
    background: '#e2a93b',
    border: 'none',
    padding: small ? '11px 14px' : '17px 24px',
    boxShadow: '0 5px 0 #a87a1f',
  };

  const secondaryStyle: React.CSSProperties = {
    ...base,
    color: '#f3e9d6',
    background: 'transparent',
    border: '2px solid #3a2e22',
    padding: small ? '9px 12px' : '15px 22px',
  };

  return (
    <button
      style={secondary ? secondaryStyle : goldStyle}
      onMouseDown={e => {
        const btn = e.currentTarget;
        btn.style.transform = 'translateY(3px)';
        btn.style.boxShadow = secondary ? 'none' : '0 2px 0 #a87a1f';
      }}
      onMouseUp={e => {
        const btn = e.currentTarget;
        btn.style.transform = '';
        btn.style.boxShadow = secondary ? '' : '0 5px 0 #a87a1f';
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget;
        btn.style.transform = '';
        btn.style.boxShadow = secondary ? '' : '0 5px 0 #a87a1f';
      }}
      {...props}
    >
      {children}
    </button>
  );
}
