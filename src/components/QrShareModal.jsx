import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, Wifi } from 'lucide-react';

export default function QrShareModal({ isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [networkUrl, setNetworkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        const joinUrl = data.suggestedUrl || window.location.origin;
        setNetworkUrl(joinUrl);
        QRCode.toDataURL(joinUrl, {
          width: 280,
          margin: 1,
          color: {
            dark: '#09090B',
            light: '#FFFFFF'
          }
        }).then(setQrDataUrl);
      })
      .catch(() => {
        const fallback = window.location.origin;
        setNetworkUrl(fallback);
        QRCode.toDataURL(fallback, { width: 280, margin: 1 }).then(setQrDataUrl);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(networkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="white-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '32px 28px',
          position: 'relative',
          textAlign: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
          <Smartphone size={18} color="var(--g-blue)" />
          <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)' }}>
            SCAN TO JOIN LIVE SESSION
          </span>
        </div>

        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
          Connect Your Phone
        </h3>

        <div className="four-colour-rule" style={{ maxWidth: '140px', margin: '10px auto 16px' }} />

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
          Point your mobile phone camera at this QR code to join the live session on venue Wi-Fi.
        </p>

        {/* QR Code Frame */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            display: 'inline-block',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: '0 4px 20px rgba(60,64,67,0.08)',
            marginBottom: '20px'
          }}
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Workshop Join QR Code" style={{ display: 'block', width: '220px', height: '220px' }} />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Generating QR...
            </div>
          )}
        </div>

        {/* URL Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <Wifi size={14} color="var(--g-blue)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--g-blue-ink)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {networkUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', flexShrink: 0 }}
          >
            {copied ? <><Check size={13} color="var(--g-green)" /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}
