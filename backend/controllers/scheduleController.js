const db = require('../../database/db');
const schedulerEngine = require('../../agent/scheduler/schedulerEngine');

async function getAllSchedules(req, res, next) {
  try {
    const schedules = await db.all(
      `SELECT s.*, g.group_name, g.whatsapp_group_id, g.category, g.audience, g.language 
       FROM schedules s
       JOIN whatsapp_groups g ON s.group_id = g.id
       ORDER BY s.id DESC`
    );
    return res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    const {
      groupId,
      topic,
      contentType = 'Daily Tip',
      postingTime = '09:00',
      frequency = 'Daily',
      cronExpression,
      enabled = 1
    } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group selection is required.' });
    }
    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required.' });
    }

    const group = await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'WhatsApp group not found.' });
    }

    const finalCron = cronExpression || schedulerEngine.constructor.generateCronExpression(postingTime, frequency);

    const result = await db.run(
      `INSERT INTO schedules (group_id, topic, content_type, posting_time, frequency, cron_expression, enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [groupId, topic, contentType, postingTime, frequency, finalCron, enabled ? 1 : 0]
    );

    await schedulerEngine.reloadSchedules();

    const created = await db.get(
      `SELECT s.*, g.group_name 
       FROM schedules s 
       JOIN whatsapp_groups g ON s.group_id = g.id 
       WHERE s.id = ?`,
      [result.lastID]
    );

    return res.status(201).json({ success: true, message: 'Schedule created successfully.', data: created });
  } catch (err) {
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { topic, contentType, postingTime, frequency, cronExpression, enabled, groupId } = req.body;

    const existing = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found.' });
    }

    const newGroupId = groupId !== undefined ? groupId : existing.group_id;
    const newTopic = topic !== undefined ? topic : existing.topic;
    const newContentType = contentType !== undefined ? contentType : existing.content_type;
    const newPostingTime = postingTime !== undefined ? postingTime : existing.posting_time;
    const newFrequency = frequency !== undefined ? frequency : existing.frequency;
    const newCron = cronExpression !== undefined ? cronExpression : (
      postingTime || frequency ? schedulerEngine.constructor.generateCronExpression(newPostingTime, newFrequency) : existing.cron_expression
    );
    const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;

    await db.run(
      `UPDATE schedules 
       SET group_id = ?, topic = ?, content_type = ?, posting_time = ?, frequency = ?, cron_expression = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newGroupId, newTopic, newContentType, newPostingTime, newFrequency, newCron, newEnabled, id]
    );

    await schedulerEngine.reloadSchedules();

    const updated = await db.get(
      `SELECT s.*, g.group_name 
       FROM schedules s 
       JOIN whatsapp_groups g ON s.group_id = g.id 
       WHERE s.id = ?`,
      [id]
    );

    return res.json({ success: true, message: 'Schedule updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id FROM schedules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found.' });
    }

    await db.run('DELETE FROM schedules WHERE id = ?', [id]);
    await schedulerEngine.reloadSchedules();

    return res.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

async function toggleSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Schedule not found.' });
    }

    const nextState = existing.enabled === 1 ? 0 : 1;
    await db.run('UPDATE schedules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nextState, id]);
    await schedulerEngine.reloadSchedules();

    return res.json({
      success: true,
      message: `Schedule ${nextState ? 'enabled' : 'disabled'} successfully.`,
      enabled: !!nextState
    });
  } catch (err) {
    next(err);
  }
}

async function runNow(req, res, next) {
  try {
    const { id } = req.params;
    const result = await schedulerEngine.executeJob(id);
    return res.json({ success: true, message: 'Schedule executed.', result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  runNow
};
