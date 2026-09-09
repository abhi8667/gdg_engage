import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import BarChart from '../components/BarChart';
import {
  Ticket,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const SEQUENCE_COLORS = [
  { brand: 'var(--g-blue)', ink: 'var(--g-blue-ink)', bgSubtle: 'rgba(66, 133, 244, 0.06)' },
  { brand: 'var(--g-red)', ink: 'var(--g-red-ink)', bgSubtle: 'rgba(234, 67, 53, 0.06)' },
  { brand: 'var(--g-yellow)', ink: 'var(--g-yellow-ink)', bgSubtle: 'rgba(251, 188, 4, 0.08)' },
  { brand: 'var(--g-green)', ink: 'var(--g-green-ink)', bgSubtle: 'rgba(52, 168, 83, 0.06)' }
];

export default function StudentView({ onHostUnlock }) {
  const {
    ticketId,
    attendee,
    session,
    currentQuestion,
    results,
    totalResponses,
    myAnsweredQuestionId,
    mySelectedOptionId,
    joinAsStudent,
    submitAnswer
  } = useSocket();

  const [inputTicket, setInputTicket] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Handle Ticket or Host Passcode Submission
  const handleJoinSession = async (e) => {
    e.preventDefault();
    const clean = inputTicket.trim();
    if (!clean) return;

    // Instant Host Passcode check
    const isPass = clean === 'jaiswal8667?' || clean === 'jaiswal8667' || clean.toLowerCase() === 'rvce2026';
    if (isPass) {
      if (onHostUnlock) onHostUnlock();
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const res = await fetch('/api/ticket/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: clean })
      });
      const data = await res.json();

      if (data.isHost) {
        if (onHostUnlock) onHostUnlock();
      } else if (data.valid && data.attendee) {
        joinAsStudent(data.attendee.ticketId, data.attendee);
      } else {
        setValidationError(data.error || 'Ticket ID not recognized. Please check your workshop ticket.');
      }
    } catch (err) {
      setValidationError('Connection error. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: LANDING PAGE — ENTER TICKET ID
  // -------------------------------------------------------------
  if (!attendee || !ticketId) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '36px 20px 80px',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Centered Monochrome Marble Statue (Never cropped at head or feet) */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/pose/standstill.webp"
            alt="Monochrome Marble Statue"
            style={{
              width: '150px',
              height: '190px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto'
            }}
          />

          <div style={{ marginTop: '16px' }}>
            <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)' }}>
              GDG RVCE • WORKSHOP COMPANION
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '4px', color: 'var(--text-primary)' }}>
              AI & LLM Fundamentals
            </h1>

            {/* Signature Four-Colour Rule */}
            <div className="four-colour-rule" style={{ maxWidth: '160px', margin: '10px auto 14px' }} />

            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '360px', margin: '0 auto' }}>
              Connect with your booking ticket to participate in live audience responses and polls.
            </p>
          </div>
        </div>

        {/* Opaque White Card */}
        <div className="white-card" style={{ padding: '32px 26px' }}>
          <form onSubmit={handleJoinSession} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.1em'
                }}
              >
                ENTER YOUR TICKET ID
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="off"
                  value={inputTicket}
                  onChange={(e) => {
                    setInputTicket(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="e.g. AI-DCSW7L or roll number"
                  style={{
                    width: '100%',
                    padding: '16px 18px',
                    paddingRight: '48px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F8FAFC',
                    border: validationError ? '1px solid var(--g-red)' : '1px solid rgba(15, 23, 42, 0.16)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.05rem',
                    letterSpacing: '0.04em'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--g-blue-ink)'
                  }}
                >
                  <Ticket size={20} />
                </div>
              </div>

              {validationError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    fontSize: '0.8125rem',
                    color: 'var(--g-red-ink)',
                    fontWeight: 500
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isValidating || !inputTicket.trim()}
              className="btn-primary"
              style={{ padding: '16px', fontSize: '1rem', width: '100%' }}
            >
              {isValidating ? (
                <span>Validating Ticket...</span>
              ) : (
                <>
                  <span>Join Live Session</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Validation Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <ShieldCheck size={14} color="var(--g-green)" />
          <span>Validated against GDG Registration Roster</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: VALIDATED STUDENT STATE
  // -------------------------------------------------------------
  const isQuestionActive = session.status === 'ACTIVE' && !!currentQuestion;
  const hasAnsweredCurrent = isQuestionActive && myAnsweredQuestionId === currentQuestion.id;
  const isRevealed = session.isResultsRevealed && !!results;

  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '0 auto',
        padding: '24px 20px 80px',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Attendee Welcome Banner */}
      <div
        className="white-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={`/pose/${attendee.pose || 'closeup'}.webp`}
            alt={attendee.fullName}
            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--g-blue)' }}
          />
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {attendee.fullName}
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {attendee.branch} • <span style={{ color: 'var(--g-blue-ink)', fontWeight: 700 }}>{attendee.ticketId}</span>
            </div>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(52, 168, 83, 0.1)',
            border: '1px solid rgba(52, 168, 83, 0.25)',
            color: 'var(--g-green-ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            fontWeight: 700
          }}
        >
          <span className="pulse-dot" style={{ background: 'var(--g-green)' }} />
          SYNCED
        </span>
      </div>

      {/* STATE A: WAITING FOR NEXT QUESTION */}
      {!isQuestionActive ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px 12px'
          }}
        >
          {/* Centered Monochrome Marble Statue on #EAEAEA */}
          <img
            src="/pose/thinking.webp"
            alt="Roman AI Warrior"
            style={{
              width: '160px',
              height: '210px',
              objectFit: 'contain',
              marginBottom: '20px'
            }}
          />

          <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)' }}>
            STANDBY
          </span>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
            Waiting for Next Question...
          </h2>

          <div className="four-colour-rule" style={{ maxWidth: '140px', margin: '12px auto' }} />

          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '340px', lineHeight: 1.6 }}>
            The workshop host will push the next question live to your phone shortly. Keep this screen active.
          </p>
        </div>
      ) : (
        /* STATE B: ACTIVE QUESTION */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question Card */}
          <div
            className="white-card"
            style={{
              padding: '24px 22px',
              borderLeft: '4px solid var(--g-blue)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--g-blue-ink)',
                  fontWeight: 700,
                  letterSpacing: '0.08em'
                }}
              >
                {currentQuestion.category ? currentQuestion.category.toUpperCase() : 'LIVE QUESTION'}
              </span>

              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {totalResponses} responses
              </span>
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.45, color: 'var(--text-primary)' }}>
              {currentQuestion.text}
            </h2>

            <div className="four-colour-rule" style={{ marginTop: '14px', marginBottom: '0' }} />
          </div>

          {/* IF REVEALED: SHOW BARCHART BREAKDOWN */}
          {isRevealed ? (
            <div className="white-card" style={{ padding: '24px 20px' }}>
              <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)', display: 'block', marginBottom: '14px' }}>
                AUDIENCE RESULTS
              </span>

              <BarChart
                question={currentQuestion}
                tally={results}
                selectedOptionId={mySelectedOptionId}
                showYourVote={true}
              />
            </div>
          ) : hasAnsweredCurrent ? (
            /* IF ANSWERED BUT NOT REVEALED: SUBMITTED CONFIRMATION */
            <div
              className="white-card"
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                borderLeft: '4px solid var(--g-green)'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(52, 168, 83, 0.12)',
                  color: 'var(--g-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Answer Submitted!
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '320px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your response has been recorded. Results will appear right here the moment the host reveals them.
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: '#F1F5F9',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  fontWeight: 600
                }}
              >
                <Lock size={12} /> Results locked by workshop host
              </div>
            </div>
          ) : (
            /* OPTION BUTTONS WITH SEQUENCE COLOUR CYCLE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="mono-eyebrow" style={{ color: 'var(--text-muted)', paddingLeft: '4px' }}>
                TAP AN OPTION TO SUBMIT:
              </span>

              {currentQuestion.options?.map((opt, idx) => {
                const colorSet = SEQUENCE_COLORS[idx % SEQUENCE_COLORS.length];
                const isSelected = mySelectedOptionId === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => submitAnswer(currentQuestion.id, opt.id)}
                    className={`option-btn ${isSelected ? 'selected' : ''}`}
                    style={{
                      borderLeft: `4px solid ${colorSet.brand}`
                    }}
                  >
                    <div
                      className="option-letter-badge"
                      style={{
                        background: isSelected ? colorSet.brand : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : colorSet.ink,
                        borderColor: isSelected ? colorSet.brand : 'rgba(15, 23, 42, 0.08)'
                      }}
                    >
                      {opt.label || String.fromCharCode(65 + idx)}
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
