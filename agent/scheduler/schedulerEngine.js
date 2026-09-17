const cron = require('node-cron');
const db = require('../../database/db');
const { generateAndValidateContent } = require('../index');
const { sendGroupMessage, isEmergencyStopped } = require('../../whatsapp/messaging/messageQueue');
const whatsappClient = require('../../whatsapp/client/whatsappClient');

class SchedulerEngine {
  constructor() {
    this.activeTasks = new Map(); // scheduleId -> cronTask
    this.isRunning = false;
  }

  /**
   * Translates posting_time (HH:mm) & frequency into a standard cron expression
   */
  static generateCronExpression(timeStr = '09:00', frequency = 'Daily') {
    const [hourStr, minStr] = (timeStr || '09:00').split(':');
    const minute = parseInt(minStr || '0', 10);
    const hour = parseInt(hourStr || '9', 10);

    switch (frequency) {
      case 'Weekdays':
        return `${minute} ${hour} * * 1-5`;
      case 'Weekends':
        return `${minute} ${hour} * * 0,6`;
      case 'Hourly':
        return `0 * * * *`;
      case 'Daily':
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobsCount: this.activeTasks.size,
      activeScheduleIds: Array.from(this.activeTasks.keys())
    };
  }

  async initialize() {
    console.log('[Scheduler Engine] Initializing automated schedules...');
    await this.reloadSchedules();
    this.isRunning = true;
    return this.getStatus();
  }

  async reloadSchedules() {
    // Stop all current tasks
    this.stopAllSchedules();

    try {
      const schedules = await db.all(
        `SELECT s.*, g.group_name, g.whatsapp_group_id, g.category, g.audience, g.language, g.tone, g.enabled as group_enabled
         FROM schedules s
         JOIN whatsapp_groups g ON s.group_id = g.id
         WHERE s.enabled = 1 AND g.enabled = 1`
      );

      console.log(`[Scheduler Engine] Registering ${schedules.length} active schedules.`);

      for (const sched of schedules) {
        this._registerJob(sched);
      }
    } catch (err) {
      console.error('[Scheduler Engine] Failed to load schedules from DB:', err.message);
    }
  }

  _registerJob(schedule) {
    const cronExpr = schedule.cron_expression || SchedulerEngine.generateCronExpression(schedule.posting_time, schedule.frequency);

    if (!cron.validate(cronExpr)) {
      console.error(`[Scheduler Engine] Invalid cron expression '${cronExpr}' for schedule ID ${schedule.id}`);
      return;
    }

    // Cancel existing task if already running
    if (this.activeTasks.has(schedule.id)) {
      this.activeTasks.get(schedule.id).stop();
      this.activeTasks.delete(schedule.id);
    }

    const task = cron.schedule(cronExpr, async () => {
      console.log(`[Scheduler Engine] Executing scheduled job ID ${schedule.id} for group "${schedule.group_name}"`);
      await this.executeJob(schedule.id);
    });

    this.activeTasks.set(schedule.id, task);
    console.log(`[Scheduler Engine] Schedule ID ${schedule.id} scheduled with pattern [${cronExpr}]`);
  }

  async executeJob(scheduleId) {
    if (await isEmergencyStopped()) {
      console.warn(`[Scheduler Engine] Job ${scheduleId} skipped: Emergency Stop is active.`);
      return { skipped: true, reason: 'Emergency Stop active' };
    }

    const schedule = await db.get(
      `SELECT s.*, g.group_name, g.whatsapp_group_id, g.category, g.audience, g.language, g.tone, g.enabled as group_enabled
       FROM schedules s
       JOIN whatsapp_groups g ON s.group_id = g.id
       WHERE s.id = ?`,
      [scheduleId]
    );

    if (!schedule) {
      console.error(`[Scheduler Engine] Schedule ${scheduleId} not found.`);
      return { error: 'Schedule not found' };
    }

    if (!schedule.enabled || !schedule.group_enabled) {
      console.log(`[Scheduler Engine] Schedule ${scheduleId} or group is disabled. Skipping.`);
      return { skipped: true, reason: 'Disabled' };
    }

    try {
      // 1. Generate Content via AI Agent
      const autoSendSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['auto_send_enabled']);
      const autoSendEnabled = autoSendSetting && autoSendSetting.value === 'true';

      const genResult = await generateAndValidateContent({
        groupId: schedule.group_id,
        category: schedule.category || 'Data Analytics',
        topic: schedule.topic || 'SQL Basics',
        contentType: schedule.content_type || 'Daily Tip',
        audience: schedule.audience || 'Data Analytics Students',
        language: schedule.language || 'English',
        tone: schedule.tone || 'Professional & Engaging',
        autoApprove: autoSendEnabled,
        saveToDb: true
      });

      // 2. Update schedule last_run_at
      await db.run('UPDATE schedules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?', [schedule.id]);

      // 3. If automatic sending is enabled and WhatsApp is ready, send message
      if (autoSendEnabled) {
        const waStatus = whatsappClient.getStatus();
        if (waStatus.connected) {
          console.log(`[Scheduler Engine] Auto-sending generated content ID ${genResult.id} to group "${schedule.group_name}"`);
          const sendResult = await sendGroupMessage({
            groupId: schedule.group_id,
            whatsappGroupId: schedule.whatsapp_group_id,
            groupName: schedule.group_name,
            contentId: genResult.id,
            messageText: genResult.content,
            logType: 'scheduled'
          });
          return { success: true, genResult, sendResult };
        } else {
          console.warn(`[Scheduler Engine] Auto-send enabled but WhatsApp is not connected. Content saved as draft.`);
          await db.run(
            `INSERT INTO message_logs (group_id, group_name, content_id, content_snippet, scheduled_at, status, error_message, log_type) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'skipped', 'WhatsApp client not connected', 'scheduled')`,
            [schedule.group_id, schedule.group_name, genResult.id, genResult.content.substring(0, 150)]
          );
          return { success: true, genResult, sendSkipped: true, reason: 'WhatsApp offline' };
        }
      } else {
        console.log(`[Scheduler Engine] Content ID ${genResult.id} created as draft for manual admin approval.`);
        await db.run(
          `INSERT INTO message_logs (group_id, group_name, content_id, content_snippet, scheduled_at, status, log_type) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'skipped', 'scheduled')`,
          [schedule.group_id, schedule.group_name, genResult.id, genResult.content.substring(0, 150)]
        );
        return { success: true, genResult, manualApprovalPending: true };
      }
    } catch (err) {
      console.error(`[Scheduler Engine] Execution failed for schedule ${scheduleId}:`, err.message);
      await db.run(
        `INSERT INTO message_logs (group_id, group_name, scheduled_at, status, error_message, log_type) 
         VALUES (?, ?, CURRENT_TIMESTAMP, 'failed', ?, 'scheduled')`,
        [schedule.group_id, schedule.group_name, err.message]
      );
      return { error: err.message };
    }
  }

  stopAllSchedules() {
    for (const [id, task] of this.activeTasks.entries()) {
      task.stop();
    }
    this.activeTasks.clear();
    console.log('[Scheduler Engine] All schedules stopped.');
  }

  startAllSchedules() {
    return this.reloadSchedules();
  }
}

const schedulerInstance = new SchedulerEngine();

module.exports = schedulerInstance;
