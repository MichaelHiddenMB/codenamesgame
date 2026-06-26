import React from 'react';

/* All icons use the CSS box-shadow pixel-art technique from the design */

export function PixelCoin({ size = 24 }: { size?: number }) {
  const unit = Math.floor(size / 6);
  const containerSize = unit * 6 + unit * 4;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: containerSize, height: containerSize, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', top: 0, left: 0,
        width: unit, height: unit,
        background: 'transparent',
        boxShadow: `
          ${unit*2}px 0 0 #a87a1f, ${unit*3}px 0 0 #a87a1f, ${unit*4}px 0 0 #a87a1f,
          ${unit*1}px ${unit*1}px 0 #a87a1f, ${unit*2}px ${unit*1}px 0 #e2a93b, ${unit*3}px ${unit*1}px 0 #e2a93b, ${unit*4}px ${unit*1}px 0 #e2a93b, ${unit*5}px ${unit*1}px 0 #a87a1f,
          0 ${unit*2}px 0 #a87a1f, ${unit*1}px ${unit*2}px 0 #e2a93b, ${unit*2}px ${unit*2}px 0 #f7df9a, ${unit*3}px ${unit*2}px 0 #e2a93b, ${unit*4}px ${unit*2}px 0 #e2a93b, ${unit*5}px ${unit*2}px 0 #e2a93b, ${unit*6}px ${unit*2}px 0 #a87a1f,
          0 ${unit*3}px 0 #a87a1f, ${unit*1}px ${unit*3}px 0 #e2a93b, ${unit*2}px ${unit*3}px 0 #f7df9a, ${unit*3}px ${unit*3}px 0 #e2a93b, ${unit*4}px ${unit*3}px 0 #e2a93b, ${unit*5}px ${unit*3}px 0 #e2a93b, ${unit*6}px ${unit*3}px 0 #a87a1f,
          0 ${unit*4}px 0 #a87a1f, ${unit*1}px ${unit*4}px 0 #e2a93b, ${unit*2}px ${unit*4}px 0 #f7df9a, ${unit*3}px ${unit*4}px 0 #e2a93b, ${unit*4}px ${unit*4}px 0 #e2a93b, ${unit*5}px ${unit*4}px 0 #e2a93b, ${unit*6}px ${unit*4}px 0 #a87a1f,
          ${unit*1}px ${unit*5}px 0 #a87a1f, ${unit*2}px ${unit*5}px 0 #e2a93b, ${unit*3}px ${unit*5}px 0 #e2a93b, ${unit*4}px ${unit*5}px 0 #e2a93b, ${unit*5}px ${unit*5}px 0 #a87a1f,
          ${unit*2}px ${unit*6}px 0 #a87a1f, ${unit*3}px ${unit*6}px 0 #a87a1f, ${unit*4}px ${unit*6}px 0 #a87a1f
        `
      }} />
    </span>
  );
}

export function PixelMagnifier({ size = 27 }: { size?: number }) {
  const unit = Math.floor(size / 9);
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', top: 0, left: 0,
        width: unit, height: unit,
        background: 'transparent',
        boxShadow: `
          ${unit*2}px 0 0 #2f9c8f,${unit*3}px 0 0 #2f9c8f,${unit*4}px 0 0 #2f9c8f,
          ${unit*1}px ${unit*1}px 0 #2f9c8f,${unit*5}px ${unit*1}px 0 #2f9c8f,${unit*2}px ${unit*1}px 0 #7fcabf,
          0 ${unit*2}px 0 #2f9c8f,${unit*6}px ${unit*2}px 0 #2f9c8f,
          0 ${unit*3}px 0 #2f9c8f,${unit*6}px ${unit*3}px 0 #2f9c8f,
          ${unit*1}px ${unit*4}px 0 #2f9c8f,${unit*5}px ${unit*4}px 0 #2f9c8f,
          ${unit*2}px ${unit*5}px 0 #2f9c8f,${unit*3}px ${unit*5}px 0 #2f9c8f,${unit*4}px ${unit*5}px 0 #2f9c8f,${unit*5}px ${unit*5}px 0 #21766b,
          ${unit*6}px ${unit*6}px 0 #21766b,${unit*7}px ${unit*7}px 0 #21766b,${unit*8}px ${unit*8}px 0 #21766b,
          ${unit*6}px ${unit*5}px 0 #21766b,${unit*7}px ${unit*6}px 0 #21766b,${unit*8}px ${unit*7}px 0 #21766b
        `
      }} />
    </span>
  );
}

export function PixelCopyIcon({ size = 15 }: { size?: number }) {
  const unit = Math.max(1, Math.floor(size / 5));
  const s = unit * 5;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: s, height: s, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 0, left: unit, width: unit * 4, height: unit * 4, border: `${Math.max(1, unit * 0.5)}px solid #e2a93b`, borderRadius: 2 }} />
      <span style={{ position: 'absolute', top: unit, left: 0, width: unit * 4, height: unit * 4, border: `${Math.max(1, unit * 0.5)}px solid #8c7c68`, borderRadius: 2, background: '#120e0a' }} />
    </span>
  );
}

export function PixelPadlock({ size = 13 }: { size?: number }) {
  const unit = Math.max(1, Math.floor(size / 5));
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ display: 'block', width: unit * 4, height: unit * 3, border: `${unit}px solid #a4927a`, borderBottom: 0, borderRadius: `${unit * 2}px ${unit * 2}px 0 0`, marginBottom: -unit / 2 }} />
      <span style={{ display: 'block', width: unit * 6, height: unit * 4, background: '#a4927a', borderRadius: unit }} />
    </span>
  );
}
