import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState(null); // 'host' | 'student'
  const [ticketId, setTicketId] = useState(() => localStorage.getItem('gdg_ticket_id') || '');
  const [attendee, setAttendee] = useState(() => {
    try {
      const saved = localStorage.getItem('gdg_attendee');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [session, setSession] = useState({
    status: 'IDLE',
    currentQuestionId: null,
    isResultsRevealed: false
  });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalResponses, setTotalResponses] = useState(0);
  const [results, setResults] = useState(null);
  const [totalStudentsConnected, setTotalStudentsConnected] = useState(0);

  // Student specific response tracking
  const [myAnsweredQuestionId, setMyAnsweredQuestionId] = useState(null);
  const [mySelectedOptionId, setMySelectedOptionId] = useState(null);

  // Host specific data
  const [hostQuestions, setHostQuestions] = useState([]);
  const [hostTally, setHostTally] = useState({ total: 0, counts: {}, percentages: {} });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const getWsUrl = () => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // When running Vite dev server (port 3000), point to WebSocket server on 3001
    // or proxy via /ws
    if (loc.port === '3000') {
      return `${protocol}//${loc.hostname}:3001/ws`;
    }
    return `${protocol}//${loc.host}/ws`;
  };

  const send = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // If we already have a role set, re-identify
        if (role === 'host') {
          ws.send(JSON.stringify({ type: 'identify', role: 'host' }));
        } else if (role === 'student' && ticketId) {
          ws.send(JSON.stringify({ type: 'identify', role: 'student', ticketId, attendee }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'session_update': {
              setSession(data.session);
              setCurrentQuestion(data.currentQuestion);
              setTotalResponses(data.totalResponses || 0);
              setResults(data.results || null);
              if (data.totalStudentsConnected !== undefined) {
                setTotalStudentsConnected(data.totalStudentsConnected);
              }
              // If question changed, reset student selection if new
              if (data.currentQuestion && data.currentQuestion.id !== myAnsweredQuestionId) {
                // Check if we answered this one in local session
                const savedAnswer = localStorage.getItem(`ans_${data.currentQuestion.id}`);
                if (savedAnswer) {
                  setMyAnsweredQuestionId(data.currentQuestion.id);
                  setMySelectedOptionId(savedAnswer);
                } else {
                  setMyAnsweredQuestionId(null);
                  setMySelectedOptionId(null);
                }
              }
              break;
            }

            case 'host_session_update': {
              setSession(data.session);
              setCurrentQuestion(data.currentQuestion);
              setTotalResponses(data.totalResponses || 0);
              setHostTally(data.tally || { total: 0, counts: {}, percentages: {} });
              if (data.questions) setHostQuestions(data.questions);
              if (data.totalStudentsConnected !== undefined) {
                setTotalStudentsConnected(data.totalStudentsConnected);
              }
              break;
            }

            case 'response_count_update': {
              if (data.count !== undefined) {
                setTotalResponses(data.count);
              }
              if (data.tally) {
                setHostTally(data.tally);
              }
              break;
            }

            case 'answer_confirmed': {
              setMyAnsweredQuestionId(data.questionId);
              setMySelectedOptionId(data.selectedOptionId);
              localStorage.setItem(`ans_${data.questionId}`, data.selectedOptionId);
              break;
            }

            case 'connection_count': {
              if (data.totalStudentsConnected !== undefined) {
                setTotalStudentsConnected(data.totalStudentsConnected);
              }
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Auto-reconnect with exponential backoff
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [role, ticketId, attendee, myAnsweredQuestionId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Actions
  const joinAsStudent = (validTicketId, attendeeData) => {
    setRole('student');
    setTicketId(validTicketId);
    setAttendee(attendeeData);
    localStorage.setItem('gdg_ticket_id', validTicketId);
    localStorage.setItem('gdg_attendee', JSON.stringify(attendeeData));
    send({
      type: 'identify',
      role: 'student',
      ticketId: validTicketId,
      attendee: attendeeData
    });
  };

  const logoutStudent = () => {
    setTicketId('');
    setAttendee(null);
    localStorage.removeItem('gdg_ticket_id');
    localStorage.removeItem('gdg_attendee');
    setRole(null);
  };

  const joinAsHost = () => {
    setRole('host');
    send({
      type: 'identify',
      role: 'host'
    });
  };

  const submitAnswer = (questionId, optionId) => {
    send({
      type: 'student:submit_answer',
      questionId,
      optionId,
      ticketId,
      attendee
    });
  };

  const hostStartSession = () => send({ type: 'host:start_session' });
  const hostEndSession = () => send({ type: 'host:end_session' });
  const hostPushQuestion = (questionId) => send({ type: 'host:push_question', questionId });
  const hostRevealResults = (questionId) => send({ type: 'host:reveal_results', questionId });
  const hostCloseQuestion = (questionId) => send({ type: 'host:close_question', questionId });
  const hostResetQuestion = (questionId) => send({ type: 'host:reset_question', questionId });

  const hostAddQuestion = async (newQuestionData) => {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestionData)
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to add question:', err);
      return { ok: false, error: err.message };
    }
  };

  return (
    <SocketContext.Provider
      value={{
        connected,
        role,
        ticketId,
        attendee,
        session,
        currentQuestion,
        totalResponses,
        results,
        totalStudentsConnected,
        myAnsweredQuestionId,
        mySelectedOptionId,
        hostQuestions,
        hostTally,
        joinAsStudent,
        logoutStudent,
        joinAsHost,
        submitAnswer,
        hostStartSession,
        hostEndSession,
        hostPushQuestion,
        hostRevealResults,
        hostCloseQuestion,
        hostResetQuestion,
        hostAddQuestion
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
