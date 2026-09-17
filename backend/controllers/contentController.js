const db = require('../../database/db');
const agent = require('../../agent');
const { sendGroupMessage } = require('../../whatsapp/messaging/messageQueue');

async function generateContent(req, res, next) {
  try {
    const {
      groupId,
      category,
      topic,
      contentType,
      audience,
      language,
      tone,
      customInstructions,
      model,
      autoApprove
    } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required.' });
    }

    // If groupId is provided, get group defaults if fields are omitted
    let finalCategory = category;
    let finalAudience = audience;
    let finalLanguage = language;
    let finalTone = tone;
    let finalContentType = contentType;

    if (groupId) {
      const group = await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [groupId]);
      if (group) {
        if (!finalCategory) finalCategory = group.category;
        if (!finalAudience) finalAudience = group.audience;
        if (!finalLanguage) finalLanguage = group.language;
        if (!finalTone) finalTone = group.tone;
        if (!finalContentType) finalContentType = group.content_type;
      }
    }

    const result = await agent.generateAndValidateContent({
      groupId,
      category: finalCategory || 'Data Analytics',
      topic,
      contentType: finalContentType || 'Daily Tip',
      audience: finalAudience || 'Data Analytics Students',
      language: finalLanguage || 'English',
      tone: finalTone || 'Professional & Engaging',
      customInstructions,
      model,
      autoApprove: !!autoApprove,
      saveToDb: true
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getAllContent(req, res, next) {
  try {
    const { category, status, topic, groupId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT c.*, g.group_name 
      FROM generated_content c
      LEFT JOIN whatsapp_groups g ON c.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (topic) {
      query += ' AND c.topic LIKE ?';
      params.push(`%${topic}%`);
    }
    if (groupId) {
      query += ' AND c.group_id = ?';
      params.push(groupId);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countRow = await db.get(countQuery, params);

    query += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
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

async function getContentById(req, res, next) {
  try {
    const { id } = req.params;
    const content = await db.get(
      `SELECT c.*, g.group_name, g.whatsapp_group_id 
       FROM generated_content c 
       LEFT JOIN whatsapp_groups g ON c.group_id = g.id 
       WHERE c.id = ?`,
      [id]
    );

    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found.' });
    }

    return res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

async function updateContent(req, res, next) {
  try {
    const { id } = req.params;
    const { content, topic, status, approved } = req.body;

    const existing = await db.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Content not found.' });
    }

    const newContent = content !== undefined ? content : existing.content;
    const newTopic = topic !== undefined ? topic : existing.topic;
    const newStatus = status !== undefined ? status : existing.status;
    const newApproved = approved !== undefined ? (approved ? 1 : 0) : existing.approved;

    await db.run(
      `UPDATE generated_content 
       SET content = ?, topic = ?, status = ?, approved = ? 
       WHERE id = ?`,
      [newContent, newTopic, newStatus, newApproved, id]
    );

    const updated = await db.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function approveContent(req, res, next) {
  try {
    const { id } = req.params;
    await db.run(
      `UPDATE generated_content SET approved = 1, status = 'approved' WHERE id = ?`,
      [id]
    );
    const updated = await db.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Content approved.', data: updated });
  } catch (err) {
    next(err);
  }
}

async function rejectContent(req, res, next) {
  try {
    const { id } = req.params;
    await db.run(
      `UPDATE generated_content SET approved = 0, status = 'rejected' WHERE id = ?`,
      [id]
    );
    const updated = await db.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Content rejected.', data: updated });
  } catch (err) {
    next(err);
  }
}

async function sendContentNow(req, res, next) {
  try {
    const { id } = req.params;
    const { targetGroupId } = req.body;

    const contentRow = await db.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    if (!contentRow) {
      return res.status(404).json({ success: false, error: 'Content item not found.' });
    }

    const groupId = targetGroupId || contentRow.group_id;
    if (!groupId) {
      return res.status(400).json({ success: false, error: 'No target group selected for sending.' });
    }

    const group = await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Target WhatsApp group not found.' });
    }

    const sendResult = await sendGroupMessage({
      groupId: group.id,
      whatsappGroupId: group.whatsapp_group_id,
      groupName: group.group_name,
      contentId: contentRow.id,
      messageText: contentRow.content,
      logType: 'immediate'
    });

    return res.json({
      success: true,
      message: `Message dispatched successfully to "${group.group_name}".`,
      data: sendResult
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateContent,
  getAllContent,
  getContentById,
  updateContent,
  approveContent,
  rejectContent,
  sendContentNow
};
