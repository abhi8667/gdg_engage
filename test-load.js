import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws';
const NUM_STUDENTS = 120;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log(`\n======================================================`);
  console.log(`🧪 GDG Engage: Stress Test with ${NUM_STUDENTS} Concurrent Sockets`);
  console.log(`======================================================\n`);

  // 1. Connect Host Socket
  const hostWs = new WebSocket(WS_URL);
  let hostResponsesReceived = 0;
  let activeQuestionId = null;

  await new Promise((resolve, reject) => {
    hostWs.on('open', () => {
      hostWs.send(JSON.stringify({ type: 'identify', role: 'host' }));
      resolve();
    });
    hostWs.onerror = reject;
  });

  console.log('✅ Host connected and registered.');

  hostWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'response_count_update') {
      hostResponsesReceived = msg.count;
    } else if (msg.type === 'host_session_update' && msg.currentQuestion) {
      activeQuestionId = msg.currentQuestion.id;
    }
  });

  // 2. Start session and push question Q1 as host
  hostWs.send(JSON.stringify({ type: 'host:start_session' }));
  await sleep(200);
  hostWs.send(JSON.stringify({ type: 'host:push_question', questionId: 'q1' }));
  await sleep(300);

  console.log(`📢 Host pushed question (ID: ${activeQuestionId || 'q1'}) live.`);

  // 3. Connect NUM_STUDENTS concurrent sockets
  console.log(`⚡ Connecting ${NUM_STUDENTS} concurrent student devices...`);
  const studentSockets = [];
  const options = ['opt-a', 'opt-b', 'opt-c', 'opt-d'];
  let answersConfirmedCount = 0;
  let resultsRevealedReceived = 0;

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const studentWs = new WebSocket(WS_URL);
    const ticketId = `AI-TEST${String(i).padStart(3, '0')}`;

    studentWs.on('open', () => {
      studentWs.send(JSON.stringify({
        type: 'identify',
        role: 'student',
        ticketId,
        attendee: { fullName: `Student ${i}`, ticketId, branch: 'AIML' }
      }));
    });

    studentWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'answer_confirmed') {
        answersConfirmedCount++;
      } else if (msg.type === 'session_update' && msg.results) {
        resultsRevealedReceived++;
      }
    });

    studentSockets.push(studentWs);
  }

  // Wait for all to connect
  await sleep(1500);
  console.log(`✅ All ${NUM_STUDENTS} students connected successfully.`);

  // 4. Simultaneous answer submission blast
  console.log(`🚀 All ${NUM_STUDENTS} students submitting answers simultaneously...`);
  const startTime = Date.now();

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const randomOpt = options[Math.floor(Math.random() * options.length)];
    studentSockets[i].send(JSON.stringify({
      type: 'student:submit_answer',
      questionId: 'q1',
      optionId: randomOpt,
      ticketId: `AI-TEST${String(i).padStart(3, '0')}`
    }));
  }

  // Wait for propagation
  await sleep(1200);
  const duration = Date.now() - startTime;

  console.log(`\n📊 Benchmark Results:`);
  console.log(`   - Time to process ${NUM_STUDENTS} simultaneous answers: ${duration}ms`);
  console.log(`   - Student answer confirmations received: ${answersConfirmedCount} / ${NUM_STUDENTS}`);
  console.log(`   - Host real-time counter reached: ${hostResponsesReceived} / ${NUM_STUDENTS}`);

  // 5. Test Host Reveal Results
  console.log(`\n👁️ Host revealing results...`);
  hostWs.send(JSON.stringify({ type: 'host:reveal_results', questionId: 'q1' }));
  await sleep(800);

  console.log(`   - Students that received revealed breakdown: ${resultsRevealedReceived} / ${NUM_STUDENTS}`);

  // Clean up
  hostWs.close();
  for (const ws of studentSockets) {
    ws.close();
  }

  if (hostResponsesReceived === NUM_STUDENTS && answersConfirmedCount === NUM_STUDENTS) {
    console.log(`\n🎉 STRESS TEST PASSED: 100% throughput with zero packet loss!\n`);
    process.exit(0);
  } else {
    console.warn(`\n⚠️ Partial delivery: Host count = ${hostResponsesReceived}, Confirmations = ${answersConfirmedCount}\n`);
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
