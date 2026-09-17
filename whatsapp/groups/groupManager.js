const db = require('../../database/db');
const whatsappClient = require('../client/whatsappClient');

/**
 * Synchronizes groups retrieved from active WhatsApp session into SQLite database
 */
async function syncGroupsFromWhatsApp() {
  const status = whatsappClient.getStatus();
  if (!status.connected) {
    throw new Error('WhatsApp is not connected. Connect and scan QR before syncing groups.');
  }

  const liveGroups = await whatsappClient.getGroups();
  console.log(`[Group Manager] Found ${liveGroups.length} groups in WhatsApp session.`);

  const syncedList = [];

  for (const group of liveGroups) {
    const existing = await db.get(
      'SELECT * FROM whatsapp_groups WHERE whatsapp_group_id = ?',
      [group.id]
    );

    if (existing) {
      // Update name and participant count
      await db.run(
        `UPDATE whatsapp_groups 
         SET group_name = ?, participant_count = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [group.name, group.participantCount, existing.id]
      );
      syncedList.push({ ...existing, group_name: group.name, participant_count: group.participantCount });
    } else {
      // Insert new group with sensible defaults
      const res = await db.run(
        `INSERT INTO whatsapp_groups 
         (group_name, whatsapp_group_id, enabled, category, audience, language, topic, tone, content_type, posting_time, frequency, participant_count) 
         VALUES (?, ?, 0, 'Data Analytics', 'Data Analytics Students', 'English', 'SQL Basics & Queries', 'Professional & Engaging', 'Daily Tip', '09:00', 'Daily', ?)`,
        [group.name, group.id, group.participantCount]
      );
      syncedList.push({
        id: res.lastID,
        group_name: group.name,
        whatsapp_group_id: group.id,
        enabled: 0,
        category: 'Data Analytics',
        audience: 'Data Analytics Students',
        language: 'English',
        topic: 'SQL Basics & Queries',
        tone: 'Professional & Engaging',
        content_type: 'Daily Tip',
        posting_time: '09:00',
        frequency: 'Daily',
        participant_count: group.participantCount
      });
    }
  }

  return syncedList;
}

/**
 * Get all stored groups from database with optional filters
 */
async function getAllGroups(filters = {}) {
  let query = 'SELECT * FROM whatsapp_groups WHERE 1=1';
  const params = [];

  if (filters.enabled !== undefined && filters.enabled !== '') {
    query += ' AND enabled = ?';
    params.push(filters.enabled === 'true' || filters.enabled === 1 || filters.enabled === true ? 1 : 0);
  }

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.search) {
    query += ' AND (group_name LIKE ? OR topic LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY group_name ASC';
  return await db.all(query, params);
}

/**
 * Get a specific group by internal ID
 */
async function getGroupById(id) {
  return await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [id]);
}

/**
 * Update a group's automation parameters
 */
async function updateGroupSettings(id, data) {
  const allowedFields = [
    'group_name',
    'enabled',
    'category',
    'audience',
    'language',
    'topic',
    'tone',
    'content_type',
    'posting_time',
    'frequency'
  ];

  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (updates.length === 0) {
    return await getGroupById(id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `UPDATE whatsapp_groups SET ${updates.join(', ')} WHERE id = ?`;
  await db.run(query, params);

  return await getGroupById(id);
}

module.exports = {
  syncGroupsFromWhatsApp,
  getAllGroups,
  getGroupById,
  updateGroupSettings
};
