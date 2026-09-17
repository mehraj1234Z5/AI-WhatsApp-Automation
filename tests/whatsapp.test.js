const assert = require('assert');
const whatsappClient = require('../whatsapp/client/whatsappClient');
const db = require('../database/db');
const { checkSafetyLimits, isEmergencyStopped } = require('../whatsapp/messaging/messageQueue');

async function runWhatsAppTests() {
  console.log('\n--- Running WhatsApp Client & Safety Tests ---');

  // Test 1: Client status structure
  const status = whatsappClient.getStatus();
  assert(status, 'WhatsApp client should return a valid status object');
  assert(typeof status.connected === 'boolean', 'Status must contain connected boolean');
  assert(typeof status.status === 'string', 'Status string must be present');
  console.log(`✔ Test 1: WhatsApp client status verified (Initial Status: ${status.status}, Connected: ${status.connected}).`);

  // Test 2: Safety rate limits check (Normal operation)
  await db.run("UPDATE settings SET value = 'false' WHERE key = 'emergency_stop'");
  await db.run("UPDATE settings SET value = '50' WHERE key = 'max_messages_per_hour'");
  await db.run("UPDATE settings SET value = '5' WHERE key = 'min_delay_between_messages_sec'");

  let limitCheckPassed = false;
  try {
    await checkSafetyLimits();
    limitCheckPassed = true;
  } catch (e) {
    limitCheckPassed = false;
  }
  assert(limitCheckPassed, 'Safety limit check should pass under normal parameters');
  console.log('✔ Test 2: WhatsApp safety rate limiter check passed.');

  // Test 3: Emergency stop rejection in safety check
  await db.run("UPDATE settings SET value = 'true' WHERE key = 'emergency_stop'");
  let errorCaught = false;
  try {
    await checkSafetyLimits();
  } catch (err) {
    errorCaught = err.message.includes('EMERGENCY STOP is active');
  }
  assert(errorCaught, 'Safety check must reject and throw when emergency stop is active');
  // Clean up
  await db.run("UPDATE settings SET value = 'false' WHERE key = 'emergency_stop'");
  console.log('✔ Test 3: Message dispatcher immediately blocks all dispatches when Emergency Stop is enabled.');

  return true;
}

module.exports = runWhatsAppTests;

if (require.main === module) {
  runWhatsAppTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('WhatsApp Test Failed:', err);
      process.exit(1);
    });
}
