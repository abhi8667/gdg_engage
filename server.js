import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const CONVEX_URL = process.env.CONVEX_URL || 'https://canny-ferret-157.convex.cloud';

const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const DEFAULT_QUESTIONS_FILE = path.join(DATA_DIR, 'default-questions.json');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');
const ATTENDEE_CACHE_FILE = path.join(DATA_DIR, 'attendee-cache.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let questions = [];
if (fs.existsSync(QUESTIONS_FILE)) {
  try {
    questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse questions.json, falling back', e);
  }
}
if (!questions || questions.length === 0) {
  if (fs.existsSync(DEFAULT_QUESTIONS_FILE)) {
    questions = JSON.parse(fs.readFileSync(DEFAULT_QUESTIONS_FILE, 'utf-8'));
  } else {
    questions = [];
  }
}

// Session State
let session = {
  status: 'IDLE', // 'IDLE', 'ACTIVE', 'ENDED'
  currentQuestionId: null,
  isResultsRevealed: false,
  startedAt: null,
  endedAt: null
};

if (fs.existsSync(SESSION_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    session = { ...session, ...saved };
  } catch (e) {
    console.error('Failed to parse session.json', e);
  }
}

// Responses store: { [questionId]: { [ticketId]: { optionId, timestamp, attendee } } }
let responses = {};
if (fs.existsSync(RESPONSES_FILE)) {
  try {
    responses = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse responses.json', e);
  }
}

// Attendee cache for fallback resilience
let attendeeCache = {
  // Pre-seed known sample ticket
  'AI-DCSW7L': {
    ticketId: 'AI-DCSW7L',
    fullName: 'Abhinandan Jaiswal',
    branch: 'CSE',
    studentId: 'RVCE26BCS000',
    pose: 'thinking'
  }
};
if (fs.existsSync(ATTENDEE_CACHE_FILE)) {
  try {
    attendeeCache = { ...attendeeCache, ...JSON.parse(fs.readFileSync(ATTENDEE_CACHE_FILE, 'utf-8')) };
  } catch (e) {
    console.error('Failed to parse attendee-cache.json', e);
  }
}

function persistState() {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2));
    fs.writeFileSync(ATTENDEE_CACHE_FILE, JSON.stringify(attendeeCache, null, 2));
  } catch (err) {
    console.error('Failed to persist state:', err.message);
  }
}

const VALID_HOST_PASSCODES = ['jaiswal8667?', 'jaiswal8667', 'rvce2026', 'host2026', 'gdg_llm8667'];

function isHostPasscode(input) {
  if (!input) return false;
  const clean = input.trim().replace(/^["']|["']$/g, '');
  return VALID_HOST_PASSCODES.some(p => p.toLowerCase() === clean.toLowerCase());
}

// -------------------------------------------------------------
// Convex Ticket Validation
// -------------------------------------------------------------
async function validateTicketWithConvex(ticketInput) {
  const clean = ticketInput.trim();

  // Check if entering host passcode directly
  if (isHostPasscode(clean)) {
    return { valid: true, isHost: true, role: 'host' };
  }

  const cleanUpper = clean.toUpperCase();

  // Check cache first for sub-millisecond response
  if (attendeeCache[cleanUpper]) {
    return { valid: true, attendee: attendeeCache[cleanUpper], source: 'cache' };
  }

  // Also check if matches studentId or clean string in cache
  const cachedMatch = Object.values(attendeeCache).find(
    (a) => a.ticketId?.toUpperCase() === cleanUpper || a.studentId?.toUpperCase() === cleanUpper
  );
  if (cachedMatch) {
    return { valid: true, attendee: cachedMatch, source: 'cache' };
  }

  // Query Convex `attendees:mine`
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'attendees:mine',
        args: { ticketId: cleanUpper }
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.value) {
        const attendee = {
          ticketId: data.value.ticketId,
          fullName: data.value.fullName,
          branch: data.value.branch || 'AI / CS',
          studentId: data.value.studentId,
          pose: data.value.pose || 'closeup',
          year: data.value.year
        };
        // Cache it
        attendeeCache[attendee.ticketId.toUpperCase()] = attendee;
        if (attendee.studentId) {
          attendeeCache[attendee.studentId.toUpperCase()] = attendee;
        }
        persistState();
        return { valid: true, attendee, source: 'convex' };
      }
    }
  } catch (err) {
    console.warn('Convex network check failed or timed out:', err.message);
  }

  // Fallback: If attendee format matches standard ticket pattern (e.g. AI-XXXXXX or 1RV26CSXXX)
  if (/^AI-[A-Z0-9]{5,8}$/i.test(cleanUpper) || /^1?RV\d{2}[A-Z]{2,4}\d{2,4}$/i.test(cleanUpper)) {
    const fallbackAttendee = {
      ticketId: cleanUpper.startsWith('AI-') ? cleanUpper : `AI-${cleanUpper.slice(-6)}`,
      fullName: `Attendee (${cleanUpper})`,
      branch: 'AIML / CS',
      studentId: cleanUpper,
      pose: 'ready'
    };
    attendeeCache[cleanUpper] = fallbackAttendee;
    persistState();
    return { valid: true, attendee: fallbackAttendee, source: 'format_fallback' };
  }

  return { valid: false, error: 'Ticket ID or Roll Number not found in event roster' };
}

// -------------------------------------------------------------
// Express App & API Endpoints
// -------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Track discovered public URL for keep-alive self-pings and QR sharing
let discoveredPublicUrl = null;
app.use((req, res, next) => {
  if (!discoveredPublicUrl) {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      discoveredPublicUrl = `${proto}://${host}`;
    }
  }
  next();
});

// Health check & Ping endpoint for keep-alive pings and uptime monitors
app.get(['/healthz', '/api/ping'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend in production if dist exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Get Local LAN IP addresses for QR code and mobile sharing
function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

app.get('/api/network-info', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const isCloud = host && !host.includes('localhost') && !host.includes('127.0.0.1');
  const cloudUrl = isCloud ? `${proto}://${host}` : null;
  const localIps = getLocalNetworkIps();

  const suggestedUrl = process.env.PUBLIC_URL 
    || process.env.RENDER_EXTERNAL_URL 
    || cloudUrl 
    || (localIps.length > 0 ? `http://${localIps[0]}:3000` : `http://localhost:3000`);

  res.json({
    localIps,
    port: 3000,
    serverPort: PORT,
    suggestedUrl
  });
});

app.post('/api/ticket/validate', async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) {
    return res.status(400).json({ valid: false, error: 'Ticket ID is required' });
  }
  const result = await validateTicketWithConvex(ticketId);
  res.json(result);
});

app.get('/api/session', (req, res) => {
  const currentQ = questions.find((q) => q.id === session.currentQuestionId) || null;
  const currentQResponses = session.currentQuestionId ? (responses[session.currentQuestionId] || {}) : {};
  const totalResponses = Object.keys(currentQResponses).length;

  res.json({
    session,
    currentQuestion: currentQ,
    totalResponses,
    questionsCount: questions.length,
    connectedCount: connectedStudents.size
  });
});

app.get('/api/questions', (req, res) => {
  res.json({ questions });
});

app.post('/api/questions', (req, res) => {
  const { text, type, category, options, pushLiveNow } = req.body;
  if (!text || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Question text and at least 2 options are required' });
  }

  const newQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    type: type || 'mcq',
    category: category ? category.trim() : 'Live Poll',
    options: options.map((opt, idx) => ({
      id: opt.id || `opt_${idx + 1}`,
      label: opt.label || String.fromCharCode(65 + idx),
      text: typeof opt === 'string' ? opt : opt.text
    }))
  };

  questions.push(newQuestion);

  if (pushLiveNow) {
    session.status = 'ACTIVE';
    session.currentQuestionId = newQuestion.id;
    session.isResultsRevealed = false;
    responses[newQuestion.id] = responses[newQuestion.id] || {};
  }

  persistState();
  broadcastSessionState();

  res.json({ ok: true, question: newQuestion, session });
});

// Serve React SPA index.html for any remaining route in production
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// -------------------------------------------------------------
// WebSocket Real-time Hub
// -------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connections
const connectedStudents = new Map(); // ws -> { ticketId, attendee }
const connectedHosts = new Set();    // ws

function getTally(questionId) {
  const qResponses = responses[questionId] || {};
  const question = questions.find((q) => q.id === questionId);
  const total = Object.keys(qResponses).length;

  const counts = {};
  if (question && question.options) {
    for (const opt of question.options) {
      counts[opt.id] = 0;
    }
  }

  for (const resp of Object.values(qResponses)) {
    if (counts[resp.optionId] !== undefined) {
      counts[resp.optionId] += 1;
    } else {
      counts[resp.optionId] = 1;
    }
  }

  const percentages = {};
  for (const optId of Object.keys(counts)) {
    percentages[optId] = total > 0 ? Math.round((counts[optId] / total) * 100) : 0;
  }

  return { total, counts, percentages };
}

function broadcastToAll(messageObj) {
  const raw = JSON.stringify(messageObj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  }
}

function broadcastToHosts(messageObj) {
  const raw = JSON.stringify(messageObj);
  for (const hostWs of connectedHosts) {
    if (hostWs.readyState === WebSocket.OPEN) {
      hostWs.send(raw);
    }
  }
}

function broadcastSessionState() {
  const currentQ = questions.find((q) => q.id === session.currentQuestionId) || null;
  const tally = session.currentQuestionId ? getTally(session.currentQuestionId) : { total: 0, counts: {}, percentages: {} };

  // Payload for students (results stripped unless revealed)
  const studentPayload = {
    type: 'session_update',
    session: {
      status: session.status,
      currentQuestionId: session.currentQuestionId,
      isResultsRevealed: session.isResultsRevealed
    },
    currentQuestion: currentQ,
    totalResponses: tally.total,
    results: session.isResultsRevealed ? tally : null,
    totalStudentsConnected: connectedStudents.size
  };

  // Host gets full breakdown even if not revealed, but marked whether revealed to students
  const hostPayload = {
    type: 'host_session_update',
    session: {
      ...session
    },
    currentQuestion: currentQ,
    totalResponses: tally.total,
    tally,
    questions,
    totalStudentsConnected: connectedStudents.size,
    isResultsRevealed: session.isResultsRevealed
  };

  // Send to students
  const rawStudent = JSON.stringify(studentPayload);
  for (const [clientWs] of connectedStudents) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(rawStudent);
    }
  }

  // Send to hosts
  const rawHost = JSON.stringify(hostPayload);
  for (const hostWs of connectedHosts) {
    if (hostWs.readyState === WebSocket.OPEN) {
      hostWs.send(rawHost);
    }
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (messageData) => {
    try {
      const msg = JSON.parse(messageData.toString());

      switch (msg.type) {
        case 'identify': {
          if (msg.role === 'host') {
            connectedHosts.add(ws);
            broadcastSessionState();
          } else if (msg.role === 'student') {
            connectedStudents.set(ws, {
              ticketId: msg.ticketId ? msg.ticketId.toUpperCase() : 'ANON',
              attendee: msg.attendee || null
            });
            broadcastSessionState();

            // Send immediate student state including whether they already answered current question
            if (session.currentQuestionId && msg.ticketId) {
              const userResp = responses[session.currentQuestionId]?.[msg.ticketId.toUpperCase()];
              if (userResp) {
                ws.send(JSON.stringify({
                  type: 'answer_confirmed',
                  questionId: session.currentQuestionId,
                  selectedOptionId: userResp.optionId
                }));
              }
            }
          }
          break;
        }

        // Host Actions
        case 'host:start_session': {
          session.status = 'ACTIVE';
          session.startedAt = Date.now();
          persistState();
          broadcastSessionState();
          break;
        }

        case 'host:end_session': {
          session.status = 'ENDED';
          session.endedAt = Date.now();
          session.currentQuestionId = null;
          session.isResultsRevealed = false;
          persistState();
          broadcastSessionState();
          break;
        }

        case 'host:push_question': {
          const { questionId } = msg;
          const targetQ = questions.find((q) => q.id === questionId);
          if (targetQ) {
            session.status = 'ACTIVE';
            session.currentQuestionId = targetQ.id;
            session.isResultsRevealed = false;
            responses[targetQ.id] = responses[targetQ.id] || {};
            persistState();
            broadcastSessionState();
          }
          break;
        }

        case 'host:reveal_results': {
          if (session.currentQuestionId) {
            session.isResultsRevealed = true;
            persistState();
            broadcastSessionState();
          }
          break;
        }

        case 'host:close_question': {
          session.currentQuestionId = null;
          session.isResultsRevealed = false;
          persistState();
          broadcastSessionState();
          break;
        }

        case 'host:reset_question': {
          const qId = msg.questionId || session.currentQuestionId;
          if (qId) {
            responses[qId] = {};
            session.isResultsRevealed = false;
            persistState();
            broadcastSessionState();
          }
          break;
        }

        // Student Actions
        case 'student:submit_answer': {
          const { questionId, optionId, ticketId, attendee } = msg;
          if (!session.currentQuestionId || session.currentQuestionId !== questionId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Question is not currently active' }));
            return;
          }

          const cleanTicket = (ticketId || 'ANON').toUpperCase();
          responses[questionId] = responses[questionId] || {};

          // Record or update response
          responses[questionId][cleanTicket] = {
            optionId,
            timestamp: Date.now(),
            attendee: attendee || null
          };

          persistState();

          // Send confirmation back to student
          ws.send(JSON.stringify({
            type: 'answer_confirmed',
            questionId,
            selectedOptionId: optionId
          }));

          // Notify host instantly with new response count and tally
          const tally = getTally(questionId);
          broadcastToHosts({
            type: 'response_count_update',
            questionId,
            count: tally.total,
            tally
          });

          // Also broadcast student count update so student sees response volume if needed
          for (const [studentWs] of connectedStudents) {
            if (studentWs.readyState === WebSocket.OPEN) {
              studentWs.send(JSON.stringify({
                type: 'response_count_update',
                questionId,
                count: tally.total
              }));
            }
          }

          // If results were already revealed, re-broadcast updated percentages
          if (session.isResultsRevealed) {
            broadcastSessionState();
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    connectedHosts.delete(ws);
    connectedStudents.delete(ws);
    broadcastToHosts({
      type: 'connection_count',
      totalStudentsConnected: connectedStudents.size
    });
  });
});

// Heartbeat ping/pong every 30s
const pingInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});

// -------------------------------------------------------------
// Keep-Alive Self-Pinger (prevents Render free tier from sleeping)
// Pings /healthz every 2.5 minutes (150 seconds)
// -------------------------------------------------------------
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '150000', 10);
let keepAliveInterval = null;

function startKeepAlive() {
  // Check every 2.5 minutes
  keepAliveInterval = setInterval(async () => {
    const targetBase = process.env.SELF_PING_URL 
      || process.env.RENDER_EXTERNAL_URL 
      || process.env.PUBLIC_URL 
      || discoveredPublicUrl;

    if (!targetBase) {
      return; // Skip if purely running on localhost with no public domain detected yet
    }

    const pingUrl = `${targetBase.replace(/\/$/, '')}/healthz`;
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        console.log(`[Keep-Alive] Self-ping OK at ${new Date().toLocaleTimeString()} -> ${pingUrl}`);
      } else {
        console.warn(`[Keep-Alive] Ping received HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Keep-Alive] Ping warning: ${err.message}`);
    }
  }, PING_INTERVAL_MS);
}

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 GDG Engage Real-time Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready on path /ws`);
  const ips = getLocalNetworkIps();
  console.log(`📱 Local IPs for mobile in-person connection:`);
  ips.forEach((ip) => console.log(`   - http://${ip}:3000 (Vite) / http://${ip}:${PORT} (API)`));

  if (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL) {
    const live = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
    console.log(`🌐 Public Hosted URL: ${live}`);
  }
  console.log(`🔄 Self-ping keep-alive configured every ${Math.round(PING_INTERVAL_MS / 1000 / 60 * 10) / 10} min`);
  console.log(`=================================================\n`);

  startKeepAlive();
});
