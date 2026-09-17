const db = require('../../database/db');
const whatsappClient = require('../client/whatsappClient');

let lastSentTimestamp = 0;

/**
 * Checks whether the emergency stop killswitch is activated
 */
async function isEmergencyStopped() {
  const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['emergency_stop']);
  return setting && setting.value === 'true';
}

/**
 * Checks safety throttles: hourly rate limit and min delay between messages
 */
async function checkSafetyLimits() {
  if (await isEmergencyStopped()) {
    throw new Error('EMERGENCY STOP is active. All message sending is halted.');
  }

  const maxPerHourSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['max_messages_per_hour']);
  const maxPerHour = parseInt(maxPerHourSetting ? maxPerHourSetting.value : '30', 10);

  const minDelaySetting = await db.get('SELECT value FROM settings WHERE key = ?', ['min_delay_between_messages_sec']);
  const minDelaySec = parseInt(minDelaySetting ? minDelaySetting.value : '15', 10);

  // Check hourly count
  const hourAgoCount = await db.get(
    `SELECT COUNT(*) as count FROM message_logs 
     WHERE status = 'success' AND sent_at >= datetime('now', '-1 hour')`
  );

  if (hourAgoCount && hourAgoCount.count >= maxPerHour) {
    throw new Error(`Rate limit exceeded: ${hourAgoCount.count}/${maxPerHour} messages sent in the last hour.`);
  }

  // Check min delay
  const now = Date.now();
  const timeSinceLast = (now - lastSentTimestamp) / 1000;
  if (lastSentTimestamp > 0 && timeSinceLast < minDelaySec) {
    const waitTime = Math.ceil(minDelaySec - timeSinceLast);
    console.log(`[Safety Delay] Throttling for ${waitTime}s before sending next message...`);
    await new Promise(res => setTimeout(res, waitTime * 1000));
  }
}

/**
 * Send a message with retry handling and logging
 */
async function sendGroupMessage({
  groupId,
  whatsappGroupId,
  groupName,
  contentId,
  messageText,
  logType = 'scheduled'
}) {
  await checkSafetyLimits();

  const maxRetriesSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['max_retries']);
  const maxRetries = parseInt(maxRetriesSetting ? maxRetriesSetting.value : '3', 10);

  const retryDelaySetting = await db.get('SELECT value FROM settings WHERE key = ?', ['retry_delay_sec']);
  const retryDelaySec = parseInt(retryDelaySetting ? retryDelaySetting.value : '10', 10);

  let attempt = 0;
  let lastError = null;

  const contentSnippet = (messageText || '').substring(0, 150);

  // Create initial log entry
  const logRes = await db.run(
    `INSERT INTO message_logs 
     (group_id, group_name, content_id, content_snippet, scheduled_at, status, log_type) 
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'retrying', ?)`,
    [groupId, groupName, contentId, contentSnippet, logType]
  );
  const logId = logRes.lastID;

  while (attempt <= maxRetries) {
    // Re-check emergency stop on each attempt
    if (await isEmergencyStopped()) {
      await db.run(
        `UPDATE message_logs 
         SET status = 'skipped', error_message = 'Halted by Emergency Stop', retry_count = ? 
         WHERE id = ?`,
        [attempt, logId]
      );
      throw new Error('Sending cancelled: Emergency Stop activated.');
    }

    try {
      console.log(`[Message Dispatch] Sending to "${groupName}" (JID: ${whatsappGroupId}) - Attempt ${attempt + 1}/${maxRetries + 1}`);
      const sendResult = await whatsappClient.sendMessage(whatsappGroupId, messageText);

      lastSentTimestamp = Date.now();

      // Update log to success
      await db.run(
        `UPDATE message_logs 
         SET status = 'success', sent_at = CURRENT_TIMESTAMP, retry_count = ?, error_message = NULL 
         WHERE id = ?`,
        [attempt, logId]
      );

      // Update content status if contentId is provided
      if (contentId) {
        await db.run(
          `UPDATE generated_content SET status = 'sent' WHERE id = ?`,
          [contentId]
        );
      }

      return {
        success: true,
        messageId: sendResult.messageId,
        logId,
        attempts: attempt + 1
      };
    } catch (err) {
      lastError = err.message;
      attempt++;
      console.warn(`[Message Dispatch] Attempt ${attempt} failed: ${err.message}`);

      if (attempt <= maxRetries) {
        console.log(`[Message Dispatch] Waiting ${retryDelaySec}s before retry...`);
        await new Promise(r => setTimeout(r, retryDelaySec * 1000));
      }
    }
  }

  // All retries failed
  await db.run(
    `UPDATE message_logs 
     SET status = 'failed', error_message = ?, retry_count = ? 
     WHERE id = ?`,
    [lastError, attempt, logId]
  );

  if (contentId) {
    await db.run(
      `UPDATE generated_content SET status = 'failed' WHERE id = ?`,
      [contentId]
    );
  }

  throw new Error(`Failed to send message after ${maxRetries + 1} attempts. Last error: ${lastError}`);
}

/**
 * Send a test message to a single group safely
 */
async function sendTestMessage({ groupId, whatsappGroupId, groupName, messageText }) {
  return await sendGroupMessage({
    groupId,
    whatsappGroupId,
    groupName: groupName || 'Test Target',
    contentId: null,
    messageText,
    logType: 'manual_test'
  });
}

module.exports = {
  isEmergencyStopped,
  checkSafetyLimits,
  sendGroupMessage,
  sendTestMessage
};
