import React from 'react';
import { Check } from 'lucide-react';

const GOOGLE_COLORS = [
  { brand: '#4285F4', ink: '#174EA6', bgLight: 'rgba(66, 133, 244, 0.12)' }, // Blue
  { brand: '#EA4335', ink: '#A50E0E', bgLight: 'rgba(234, 67, 53, 0.12)' },  // Red
  { brand: '#FBBC04', ink: '#8A5A00', bgLight: 'rgba(251, 188, 4, 0.14)' },  // Yellow
  { brand: '#34A853', ink: '#0D652D', bgLight: 'rgba(52, 168, 83, 0.12)' }   // Green
];

export default function BarChart({ question, tally, selectedOptionId, showYourVote = true }) {
  if (!question || !question.options) return null;

  const total = tally?.total || 0;
  const counts = tally?.counts || {};
  const percentages = tally?.percentages || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {question.options.map((opt, idx) => {
        const count = counts[opt.id] || 0;
        const percent = percentages[opt.id] !== undefined ? percentages[opt.id] : (total > 0 ? Math.round((count / total) * 100) : 0);
        const color = GOOGLE_COLORS[idx % GOOGLE_COLORS.length];
        const isUserPick = showYourVote && selectedOptionId === opt.id;

        return (
          <div
            key={opt.id}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-sm)',
              border: isUserPick ? `2px solid ${color.brand}` : '1px solid rgba(15, 23, 42, 0.1)',
              background: '#FFFFFF',
              padding: '14px 16px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(60,64,67,0.06)'
            }}
          >
            {/* Animated percentage background fill using brand hue */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${percent}%`,
                background: color.bgLight,
                borderRight: `3px solid ${color.brand}`,
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'none'
              }}
            />

            {/* Content Row */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                zIndex: 2
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {/* Brand glyph */}
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    minWidth: '26px',
                    borderRadius: '4px',
                    background: color.brand,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.8125rem'
                  }}
                >
                  {opt.label || String.fromCharCode(65 + idx)}
                </span>

                <span
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word'
                  }}
                >
                  {opt.text}
                </span>

                {isUserPick && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(23, 78, 166, 0.1)',
                      border: '1px solid var(--g-blue)',
                      color: 'var(--g-blue-ink)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    <Check size={11} /> Your Choice
                  </span>
                )}
              </div>

              {/* Readout using ink variant */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: color.ink
                  }}
                >
                  {percent}%
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  ({count})
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          padding: '0 4px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600
        }}
      >
        <span>TOTAL RESPONSES: {total}</span>
        <span>GDG RVCE LIVE PULSE</span>
      </div>
    </div>
  );
}
