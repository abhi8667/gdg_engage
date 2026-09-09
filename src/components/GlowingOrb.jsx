import React from 'react';

export default function GlowingOrb({ size = 'md', variant = 'orange', className = '' }) {
  const sizePx = size === 'sm' ? 44 : size === 'lg' ? 140 : 88;

  return (
    <div
      className={`orb-container ${className}`}
      style={{
        width: `${sizePx * 1.8}px`,
        height: `${sizePx * 1.8}px`,
        margin: '0 auto'
      }}
    >
      {/* Outer 3D Orbital Ring 2 (Clockwise/Tilted) */}
      <div className="orbit-ring orbit-ring-2">
        <div className="orbit-satellite-2" />
      </div>

      {/* Inner 3D Orbital Ring 1 (Counter-Clockwise/Tilted) */}
      <div className="orbit-ring orbit-ring-1">
        <div className="orbit-satellite-1" />
      </div>

      {/* Core Glossy 3D Orb */}
      <div
        className={variant === 'cyan' ? 'glossy-orb-3d glossy-orb-cyan' : 'glossy-orb-3d'}
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`
        }}
      />
    </div>
  );
}
