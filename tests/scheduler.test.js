const assert = require('assert');
const schedulerEngine = require('../agent/scheduler/schedulerEngine');
const db = require('../database/db');
const { isEmergencyStopped } = require('../whatsapp/messaging/messageQueue');

async function runSchedulerTests() {
  console.log('\n--- Running Scheduler & Emergency Stop Tests ---');

  // Test 1: Cron Expression Generation
  const dailyCron = schedulerEngine.constructor.generateCronExpression('09:30', 'Daily');
  assert.strictEqual(dailyCron, '30 9 * * *', 'Daily at 09:30 should be 30 9 * * *');

  const weekdayCron = schedulerEngine.constructor.generateCronExpression('14:00', 'Weekdays');
  assert.strictEqual(weekdayCron, '0 14 * * 1-5', 'Weekdays at 14:00 should be 0 14 * * 1-5');

  const hourlyCron = schedulerEngine.constructor.generateCronExpression('00:00', 'Hourly');
  assert.strictEqual(hourlyCron, '0 * * * *', 'Hourly should be 0 * * * *');
  console.log('✔ Test 1: Cron expression generator accurately computed daily, weekday, and hourly patterns.');

  // Test 2: Emergency Stop Killswitch
  await db.run("UPDATE settings SET value = 'true' WHERE key = 'emergency_stop'");
  const isStopped = await isEmergencyStopped();
  assert.strictEqual(isStopped, true, 'Emergency stop should report true when set in DB');

  // Reset to false
  await db.run("UPDATE settings SET value = 'false' WHERE key = 'emergency_stop'");
  const isStoppedAfterReset = await isEmergencyStopped();
  assert.strictEqual(isStoppedAfterReset, false, 'Emergency stop should report false after reset');
  console.log('✔ Test 2: Emergency Stop killswitch state transitions verified.');

  // Test 3: Scheduler Engine Status
  const status = schedulerEngine.getStatus();
  assert(typeof status.isRunning === 'boolean', 'Scheduler status should report isRunning boolean');
  console.log(`✔ Test 3: Scheduler engine reports status correctly (isRunning: ${status.isRunning}, Active jobs: ${status.activeJobsCount}).`);

  return true;
}

module.exports = runSchedulerTests;

if (require.main === module) {
  runSchedulerTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Scheduler Test Failed:', err);
      process.exit(1);
    });
}
