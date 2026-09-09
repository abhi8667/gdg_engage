import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import BarChart from '../components/BarChart';
import {
  Play,
  Square,
  Eye,
  Plus,
  RotateCcw,
  CheckCircle2,
  Radio,
  BarChart3,
  Layers,
  Send
} from 'lucide-react';

const SEQUENCE_COLORS = [
  { brand: 'var(--g-blue)', ink: 'var(--g-blue-ink)' },
  { brand: 'var(--g-red)', ink: 'var(--g-red-ink)' },
  { brand: 'var(--g-yellow)', ink: 'var(--g-yellow-ink)' },
  { brand: 'var(--g-green)', ink: 'var(--g-green-ink)' }
];

export default function HostDashboard({ onOpenQr }) {
  const {
    session,
    currentQuestion,
    totalResponses,
    hostQuestions,
    hostTally,
    totalStudentsConnected,
    joinAsHost,
    hostStartSession,
    hostEndSession,
    hostPushQuestion,
    hostRevealResults,
    hostCloseQuestion,
    hostResetQuestion,
    hostAddQuestion
  } = useSocket();

  useEffect(() => {
    joinAsHost();
  }, [joinAsHost]);

  // On-the-fly Question Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('mcq');
  const [newQuestionCategory, setNewQuestionCategory] = useState('Live Poll');
  const [optionsList, setOptionsList] = useState([
    { text: '' },
    { text: '' },
    { text: '' },
    { text: '' }
  ]);
  const [pushImmediately, setPushImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (optionsList.length < 6) {
      setOptionsList([...optionsList, { text: '' }]);
    }
  };

  const handleRemoveOption = (index) => {
    if (optionsList.length > 2) {
      setOptionsList(optionsList.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...optionsList];
    updated[index].text = value;
    setOptionsList(updated);
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const validOptions = optionsList.filter((opt) => opt.text.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options.');
      return;
    }

    setIsSubmitting(true);
    const res = await hostAddQuestion({
      text: newQuestionText.trim(),
      type: newQuestionType,
      category: newQuestionCategory.trim(),
      options: validOptions.map((opt, i) => ({
        id: `opt_${i + 1}`,
        label: String.fromCharCode(65 + i),
        text: opt.text.trim()
      })),
      pushLiveNow: pushImmediately
    });

    setIsSubmitting(false);
    if (res.ok) {
      setShowAddModal(false);
      setNewQuestionText('');
      setOptionsList([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
    } else {
      alert(res.error || 'Failed to add question.');
    }
  };

  const isLive = session.status === 'ACTIVE' && !!currentQuestion;
  const isRevealed = session.isResultsRevealed;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* Top Header Card */}
      <div
        className="white-card"
        style={{
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderLeft: '5px solid var(--g-blue)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              className="mono-eyebrow"
              style={{
                color: session.status === 'ACTIVE' ? 'var(--g-green-ink)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Radio size={14} color={session.status === 'ACTIVE' ? 'var(--g-green)' : 'var(--text-muted)'} />
              SESSION: {session.status}
            </span>
            <span style={{ color: 'rgba(15, 23, 42, 0.2)' }}>•</span>
            <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--g-blue-ink)', fontWeight: 700 }}>
              {totalStudentsConnected} Devices Synced
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Host Command Center
          </h1>
          <div className="four-colour-rule" style={{ maxWidth: '180px', margin: '8px 0 0' }} />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {session.status !== 'ACTIVE' ? (
            <button
              onClick={hostStartSession}
              className="btn-primary"
              style={{ background: '#0D652D' }}
            >
              <Play size={16} />
              <span>START SESSION</span>
            </button>
          ) : (
            <button
              onClick={hostEndSession}
              className="btn-secondary"
              style={{ borderColor: 'var(--g-red)', color: 'var(--g-red-ink)' }}
            >
              <Square size={14} />
              <span>END SESSION</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>ADD QUESTION ON THE FLY</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* LEFT COLUMN: ACTIVE QUESTION SPOTLIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="white-card"
            style={{
              padding: '28px 24px',
              borderLeft: isLive ? '5px solid var(--g-blue)' : '1px solid rgba(15, 23, 42, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: isLive ? 'rgba(66, 133, 244, 0.1)' : '#F1F5F9',
                    border: isLive ? '1px solid var(--g-blue)' : '1px solid rgba(15, 23, 42, 0.08)',
                    color: isLive ? 'var(--g-blue-ink)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700
                  }}
                >
                  <span className={isLive ? 'pulse-dot' : ''} style={{ background: isLive ? 'var(--g-blue)' : 'var(--text-muted)' }} />
                  {isLive ? 'LIVE QUESTION' : 'NO QUESTION PUSHED'}
                </span>

                {currentQuestion && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(23, 78, 166, 0.08)',
                      color: 'var(--g-blue-ink)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontWeight: 700
                    }}
                  >
                    {currentQuestion.category || 'WORKSHOP POLL'}
                  </span>
                )}
              </div>

              {isLive && (
                <button
                  onClick={() => hostResetQuestion(currentQuestion.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600
                  }}
                  title="Clear responses and re-poll"
                >
                  <RotateCcw size={12} /> Reset Votes
                </button>
              )}
            </div>

            {currentQuestion ? (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.45, marginBottom: '20px', color: 'var(--text-primary)' }}>
                  {currentQuestion.text}
                </h2>

                {/* Response Count Ticker */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F8FAFC',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(66, 133, 244, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--g-blue)'
                      }}
                    >
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <div className="mono-eyebrow" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                        LIVE PARTICIPATION
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--g-blue-ink)' }}>{totalResponses}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                          {' '}responses received
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-eyebrow" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                      RESPONSE RATE
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--g-green-ink)' }}>
                      {totalStudentsConnected > 0
                        ? `${Math.min(100, Math.round((totalResponses / totalStudentsConnected) * 100))}%`
                        : `${totalResponses} total`}
                    </div>
                  </div>
                </div>

                {/* Controls: Reveal Results & Close Question */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                  {!isRevealed ? (
                    <button
                      onClick={() => hostRevealResults(currentQuestion.id)}
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Eye size={16} />
                      <span>REVEAL RESULTS TO AUDIENCE</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(52, 168, 83, 0.1)',
                        border: '1px solid rgba(52, 168, 83, 0.3)',
                        color: 'var(--g-green-ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        fontWeight: 700
                      }}
                    >
                      <CheckCircle2 size={16} color="var(--g-green)" />
                      <span>RESULTS BROADCAST LIVE</span>
                    </div>
                  )}

                  <button
                    onClick={() => hostCloseQuestion(currentQuestion.id)}
                    className="btn-secondary"
                    style={{ padding: '10px 18px' }}
                  >
                    <span>Close Question</span>
                  </button>
                </div>

                {/* Options List or Revealed BarChart */}
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 700
                    }}
                  >
                    <span>{isRevealed ? 'RESULTS BREAKDOWN' : 'OPTIONS (RESULTS HIDDEN)'}</span>
                    {!isRevealed && (
                      <span style={{ color: 'var(--g-blue-ink)', fontSize: '0.6875rem' }}>
                        * Click Reveal Results to project tallies
                      </span>
                    )}
                  </div>

                  {isRevealed ? (
                    <BarChart
                      question={currentQuestion}
                      tally={hostTally}
                      showYourVote={false}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentQuestion.options.map((opt, idx) => {
                        const colorSet = SEQUENCE_COLORS[idx % SEQUENCE_COLORS.length];
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: '12px 16px',
                              background: '#FFFFFF',
                              border: '1px solid rgba(15, 23, 42, 0.1)',
                              borderLeft: `4px solid ${colorSet.brand}`,
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                background: '#F1F5F9',
                                color: colorSet.ink,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              {opt.label || String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Layers size={36} color="var(--g-blue)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No Active Question Live
                </p>
                <p style={{ fontSize: '0.875rem', maxWidth: '300px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                  Select a pre-loaded question from the library or create one on the fly to push to audience phones.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PRE-LOADED QUESTION LIBRARY */}
        <div>
          <div
            className="white-card"
            style={{
              padding: '28px 24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)' }}>
                  QUESTION LIBRARY
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
                  Pre-Loaded Workshop Questions ({hostQuestions.length})
                </h3>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {hostQuestions.map((q, index) => {
                const isActive = currentQuestion && currentQuestion.id === q.id;
                const colorSet = SEQUENCE_COLORS[index % SEQUENCE_COLORS.length];

                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(66, 133, 244, 0.05)' : '#FFFFFF',
                      border: isActive ? '1px solid var(--g-blue)' : '1px solid rgba(15, 23, 42, 0.08)',
                      borderLeft: `4px solid ${colorSet.brand}`,
                      boxShadow: '0 1px 3px rgba(60,64,67,0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            color: colorSet.ink,
                            fontWeight: 800
                          }}
                        >
                          Q0{index + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: '#F1F5F9',
                            color: 'var(--text-muted)',
                            fontWeight: 700
                          }}
                        >
                          {q.category || 'MCQ'}
                        </span>
                      </div>

                      {isActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--g-blue-ink)',
                            fontWeight: 700
                          }}
                        >
                          <span className="pulse-dot" style={{ background: 'var(--g-blue)' }} />
                          LIVE NOW
                        </span>
                      ) : (
                        <button
                          onClick={() => hostPushQuestion(q.id)}
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                        >
                          <Send size={12} />
                          <span>Push Live</span>
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                      {q.text}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {q.options?.map((opt, oIdx) => (
                        <span
                          key={opt.id || oIdx}
                          style={{
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            background: '#F8FAFC',
                            border: '1px solid rgba(15, 23, 42, 0.06)',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {opt.label || String.fromCharCode(65 + oIdx)}: {opt.text.slice(0, 26)}...
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD QUESTION ON THE FLY */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="white-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '32px 28px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--g-blue-ink)' }}>
                  REAL-TIME COMPOSER
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
                  Add Question On The Fly
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Cancel
              </button>
            </div>

            <div className="four-colour-rule" style={{ marginBottom: '18px' }} />

            <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                  QUESTION TEXT *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g. In modern LLM systems, which component retrieves relevant context from a vector database?"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F8FAFC',
                    border: '1px solid rgba(15, 23, 42, 0.16)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                    CATEGORY / TOPIC
                  </label>
                  <input
                    type="text"
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value)}
                    placeholder="e.g. Architecture, RAG"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#F8FAFC',
                      border: '1px solid rgba(15, 23, 42, 0.16)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                    QUESTION TYPE
                  </label>
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#F8FAFC',
                      border: '1px solid rgba(15, 23, 42, 0.16)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="poll">Audience Pulse Poll</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 700 }}>
                    ANSWER OPTIONS
                  </label>
                  {optionsList.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--g-blue-ink)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {optionsList.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '30px',
                          height: '30px',
                          minWidth: '30px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: 'var(--g-blue-ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8125rem',
                          fontWeight: 700
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        required={i < 2}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#F8FAFC',
                          border: '1px solid rgba(15, 23, 42, 0.16)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                      {optionsList.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(66, 133, 244, 0.06)'
                }}
              >
                <input
                  type="checkbox"
                  checked={pushImmediately}
                  onChange={(e) => setPushImmediately(e.target.checked)}
                  style={{ accentColor: 'var(--g-blue)' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--g-blue-ink)' }}>
                  Push Live to All Phones Immediately Upon Saving
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  <Send size={14} />
                  <span>{pushImmediately ? 'Save & Push Live' : 'Save to Pool'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
