import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Users, QrCode, LogOut, Shield } from 'lucide-react';

export default function Navbar({ isHost, onExitHost, onOpenQr }) {
  const { connected, totalStudentsConnected, attendee, ticketId, logoutStudent } = useSocket();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 1px 3px rgba(60,64,67,0.04)',
        padding: '12px 24px'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/pose/gdg-logo.webp"
            alt="GDG Logo"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                GDG RVCE
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(66, 133, 244, 0.1)',
                  color: 'var(--g-blue-ink)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 700
                }}
              >
                LIVE
              </span>
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>AI & LLM FUNDAMENTALS</span>
              <span>•</span>
              <span>CIVIL SEMINAR HALL</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F8FAFC',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span
              className="pulse-dot"
              style={{
                background: connected ? 'var(--g-green)' : 'var(--g-red)',
                color: connected ? 'var(--g-green)' : 'var(--g-red)'
              }}
            />
            <span style={{ color: connected ? 'var(--g-green-ink)' : 'var(--g-red-ink)', fontWeight: 600 }}>
              {connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
            {isHost && (
              <>
                <span style={{ color: 'rgba(15, 23, 42, 0.2)' }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                  <Users size={12} color="var(--g-blue)" />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{totalStudentsConnected}</span>
                </div>
              </>
            )}
          </div>

          {/* If Host is active, show Host Badges & Projector QR & Exit */}
          {isHost ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(23, 78, 166, 0.1)',
                  color: 'var(--g-blue-ink)',
                  border: '1px solid rgba(23, 78, 166, 0.2)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '4px 8px',
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700
                }}
              >
                <Shield size={12} /> HOST MODE
              </span>

              <button
                onClick={onOpenQr}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}
                title="Open Join QR on projector"
              >
                <QrCode size={13} color="var(--g-blue)" />
                <span>PROJECTOR QR</span>
              </button>

              <button
                onClick={onExitHost}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--g-red-ink)' }}
                title="Exit Host Mode"
              >
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </div>
          ) : attendee && (
            /* Student Profile Info */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F8FAFC',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--g-blue-ink)' }}>
                {ticketId}
              </span>
              <button
                onClick={logoutStudent}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
                title="Change Ticket"
              >
                <LogOut size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
