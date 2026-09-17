const db = require('../../database/db');

async function getLogs(req, res, next) {
  try {
    const { status, logType, groupId, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = 'SELECT * FROM message_logs WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (logType) {
      query += ' AND log_type = ?';
      params.push(logType);
    }
    if (groupId) {
      query += ' AND group_id = ?';
      params.push(groupId);
    }
    if (search) {
      query += ' AND (group_name LIKE ? OR content_snippet LIKE ? OR error_message LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countRow = await db.get(countQuery, params);

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const rows = await db.all(query, params);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: countRow.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(countRow.total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const todayTotal = await db.get(
      `SELECT COUNT(*) as count FROM message_logs 
       WHERE date(created_at, 'localtime') = date('now', 'localtime')`
    );

    const todaySuccess = await db.get(
      `SELECT COUNT(*) as count FROM message_logs 
       WHERE status = 'success' AND date(created_at, 'localtime') = date('now', 'localtime')`
    );

    const todayFailed = await db.get(
      `SELECT COUNT(*) as count FROM message_logs 
       WHERE status = 'failed' AND date(created_at, 'localtime') = date('now', 'localtime')`
    );

    const totalGroups = await db.get('SELECT COUNT(*) as count FROM whatsapp_groups');
    const enabledGroups = await db.get('SELECT COUNT(*) as count FROM whatsapp_groups WHERE enabled = 1');
    const totalContent = await db.get('SELECT COUNT(*) as count FROM generated_content');
    const pendingDrafts = await db.get("SELECT COUNT(*) as count FROM generated_content WHERE status = 'draft'");
    const activeSchedules = await db.get('SELECT COUNT(*) as count FROM schedules WHERE enabled = 1');

    return res.json({
      success: true,
      stats: {
        todayMessages: todayTotal.count || 0,
        todaySuccess: todaySuccess.count || 0,
        todayFailed: todayFailed.count || 0,
        totalGroups: totalGroups.count || 0,
        enabledGroups: enabledGroups.count || 0,
        totalContent: totalContent.count || 0,
        pendingDrafts: pendingDrafts.count || 0,
        activeSchedules: activeSchedules.count || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function clearLogs(req, res, next) {
  try {
    const { days = 30 } = req.body;
    await db.run(
      `DELETE FROM message_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    );
    return res.json({ success: true, message: `Cleared logs older than ${days} days.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLogs,
  getStats,
  clearLogs
};
