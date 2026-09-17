const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { seed } = require('../database/seed');
const { JWT_SECRET } = require('../backend/middleware/auth');

async function runBackendTests() {
  console.log('\n--- Running Backend & Database Tests ---');

  // Test 1: Initialize Database & Seed
  await db.initDatabase();
  await seed();
  console.log('✔ Test 1: SQLite schema initialized and seeded successfully.');

  // Test 2: Admin user exists
  const admin = await db.get("SELECT * FROM users WHERE email = 'admin@whatsappagent.local'");
  assert(admin, 'Admin user should exist in SQLite');
  assert.strictEqual(admin.role, 'admin', 'Admin role should be admin');
  const isPassValid = await bcrypt.compare('adminpassword123', admin.password_hash);
  assert(isPassValid, 'Admin password hash should match default password');
  console.log('✔ Test 2: Admin user credentials and password hash verified.');

  // Test 3: JWT token generation and verification
  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.strictEqual(decoded.email, admin.email, 'Decoded JWT email must match');
  console.log('✔ Test 3: JWT authentication token generation and verification verified.');

  // Test 4: Default Categories & Topics
  const categories = await db.all('SELECT * FROM content_categories');
  assert(categories.length >= 13, `Expected at least 13 categories, found ${categories.length}`);
  const topics = await db.all('SELECT * FROM content_topics');
  assert(topics.length >= 50, `Expected at least 50 topics, found ${topics.length}`);
  console.log(`✔ Test 4: Content categories (${categories.length}) and topics (${topics.length}) verified.`);

  // Test 5: Default Settings Table
  const emergencyStop = await db.get("SELECT value FROM settings WHERE key = 'emergency_stop'");
  assert(emergencyStop, 'emergency_stop setting must exist');
  console.log('✔ Test 5: System settings table verified.');

  return true;
}

module.exports = runBackendTests;

if (require.main === module) {
  runBackendTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backend Test Failed:', err);
      process.exit(1);
    });
}
