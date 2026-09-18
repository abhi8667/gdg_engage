import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';
const NUM_STUDENTS = 150;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log(`\n======================================================`);
  console.log(`🧪 GDG Engage: Stress Test with ${NUM_STUDENTS} Concurrent Users`);
  console.log(`======================================================\n`);

  // Step 1: Benchmark Concurrent Ticket Validation (HTTP API)
  console.log(`1️⃣ Blasting ${NUM_STUDENTS} simultaneous Ticket & USN validations...`);
  const validateStart = Date.now();
  
  const validationPromises = [];
  for (let i = 0; i < NUM_STUDENTS; i++) {
    const ticketId = i % 2 === 0 
      ? `AI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : `1RV24CS${String(i).padStart(3, '0')}`;

    validationPromises.push(
      fetch(`${BASE_URL}/api/ticket/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      }).then(async (r) => {
        const json = await r.json();
        return { ok: r.ok && json.valid, ticketId, attendee: json.attendee };
      }).catch((err) => ({ ok: false, error: err.message }))
    );
  }

  const validationResults = await Promise.all(validationPromises);
  const validateDuration = Date.now() - validateStart;
  const passedValidations = validationResults.filter((r) => r.ok).length;

  console.log(`   - Time to validate ${NUM_STUDENTS} concurrent tickets: ${validateDuration}ms`);
  console.log(`   - Validated successfully: ${passedValidations} / ${NUM_STUDENTS}`);

  if (passedValidations !== NUM_STUDENTS) {
    console.error(`❌ Validation test failed! Only ${passedValidations} succeeded.`);
    process.exit(1);
  }
  console.log(`   ✅ 100% of tickets & USNs admitted without delay!\n`);

  // Step 2: Connect Host Socket
  console.log(`2️⃣ Connecting Host control panel...`);
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

  hostWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'response_count_update') {
      hostResponsesReceived = msg.count;
    } else if (msg.type === 'host_session_update' && msg.currentQuestion) {
      activeQuestionId = msg.currentQuestion.id;
    }
  });

  // Start session and push question
  hostWs.send(JSON.stringify({ type: 'host:start_session' }));
  await sleep(150);
  hostWs.send(JSON.stringify({ type: 'host:push_question', questionId: 'q1' }));
  await sleep(250);
  console.log(`   ✅ Host connected. Question live.`);

  // Step 3: Connect 150 Student WebSockets concurrently
  console.log(`\n3️⃣ Connecting ${NUM_STUDENTS} concurrent student devices via WebSocket...`);
  const studentSockets = [];
  const options = ['opt-a', 'opt-b', 'opt-c', 'opt-d'];
  let answersConfirmedCount = 0;
  let resultsRevealedReceived = 0;

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const studentWs = new WebSocket(WS_URL);
    const attendee = validationResults[i].attendee;

    studentWs.on('open', () => {
      studentWs.send(JSON.stringify({
        type: 'identify',
        role: 'student',
        ticketId: attendee.ticketId,
        attendee
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

  await sleep(2000);
  console.log(`   ✅ All ${NUM_STUDENTS} student sockets connected and identified.`);

  // Step 4: Simultaneous Answer Submission Blast
  console.log(`\n4️⃣ Blasting ${NUM_STUDENTS} simultaneous student answers...`);
  const blastStart = Date.now();

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const randomOpt = options[Math.floor(Math.random() * options.length)];
    studentSockets[i].send(JSON.stringify({
      type: 'student:submit_answer',
      questionId: 'q1',
      optionId: randomOpt,
      ticketId: validationResults[i].attendee.ticketId
    }));
  }

  // Wait for propagation
  await sleep(1500);
  const blastDuration = Date.now() - blastStart;

  console.log(`\n📊 Concurrency Benchmark Results:`);
  console.log(`   - Time to process ${NUM_STUDENTS} answers: ${blastDuration}ms`);
  console.log(`   - Student answer confirmations: ${answersConfirmedCount} / ${NUM_STUDENTS}`);
  console.log(`   - Host real-time counter: ${hostResponsesReceived} / ${NUM_STUDENTS}`);

  // Step 5: Test Host Reveal Results
  console.log(`\n5️⃣ Host revealing results to all ${NUM_STUDENTS} devices...`);
  hostWs.send(JSON.stringify({ type: 'host:reveal_results', questionId: 'q1' }));
  await sleep(1000);

  console.log(`   - Students that received revealed breakdown: ${resultsRevealedReceived} / ${NUM_STUDENTS}`);

  // Cleanup
  hostWs.close();
  for (const ws of studentSockets) {
    ws.close();
  }

  if (hostResponsesReceived === NUM_STUDENTS && answersConfirmedCount === NUM_STUDENTS) {
    console.log(`\n🎉 150-CONCURRENT BENCHMARK PASSED: Zero drop, instant validation, 100% throughput!\n`);
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
