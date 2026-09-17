const db = require('../../database/db');
const { sendTestMessage, sendGroupMessage } = require('../../whatsapp/messaging/messageQueue');

async function testMessage(req, res, next) {
  try {
    const { groupId, messageText } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Target Group ID is required.' });
    }
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message text cannot be empty.' });
    }

    const group = await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'WhatsApp group not found in database.' });
    }

    console.log(`[Test Message] Sending test dispatch to single group "${group.group_name}"`);
    const result = await sendTestMessage({
      groupId: group.id,
      whatsappGroupId: group.whatsapp_group_id,
      groupName: group.group_name,
      messageText
    });

    return res.json({
      success: true,
      message: `Test message sent to "${group.group_name}".`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function sendImmediate(req, res, next) {
  try {
    const { groupId, messageText, contentId } = req.body;

    if (!groupId || !messageText) {
      return res.status(400).json({ success: false, error: 'Group ID and message text are required.' });
    }

    const group = await db.get('SELECT * FROM whatsapp_groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ success: false, error: 'WhatsApp group not found.' });
    }

    const result = await sendGroupMessage({
      groupId: group.id,
      whatsappGroupId: group.whatsapp_group_id,
      groupName: group.group_name,
      contentId: contentId || null,
      messageText,
      logType: 'immediate'
    });

    return res.json({
      success: true,
      message: `Message sent to "${group.group_name}".`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  testMessage,
  sendImmediate
};
