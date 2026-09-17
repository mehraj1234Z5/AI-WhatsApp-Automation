const runBackendTests = require('./backend.test');
const runAITests = require('./ai-agent.test');
const runSchedulerTests = require('./scheduler.test');
const runWhatsAppTests = require('./whatsapp.test');

async function runAllTests() {
  console.log('========================================================');
  console.log('  RUNNING COMPLETE SYSTEM TEST SUITE');
  console.log('========================================================');

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  const suites = [
    { name: 'Backend & Database Suite', fn: runBackendTests },
    { name: 'AI Agent & Validator Suite', fn: runAITests },
    { name: 'Scheduler & Emergency Stop Suite', fn: runSchedulerTests },
    { name: 'WhatsApp & Safety Throttling Suite', fn: runWhatsAppTests }
  ];

  for (const suite of suites) {
    try {
      await suite.fn();
      results.push({ name: suite.name, status: 'PASSED' });
      passedCount++;
    } catch (err) {
      console.error(`\n✖ [FAILED] ${suite.name}:`, err.message);
      results.push({ name: suite.name, status: 'FAILED', error: err.message });
      failedCount++;
    }
  }

  console.log('\n========================================================');
  console.log('  TEST SUMMARY REPORT');
  console.log('========================================================');
  for (const r of results) {
    console.log(`[${r.status === 'PASSED' ? '✔ PASS' : '✖ FAIL'}] ${r.name} ${r.error ? `(${r.error})` : ''}`);
  }
  console.log(`\nTotal Suites: ${suites.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
