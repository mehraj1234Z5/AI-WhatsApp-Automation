const whatsappClient = require('../../whatsapp/client/whatsappClient');
const groupManager = require('../../whatsapp/groups/groupManager');

async function getStatus(req, res) {
  const status = whatsappClient.getStatus();
  return res.json({ success: true, data: status });
}

async function connect(req, res, next) {
  try {
    const status = await whatsappClient.initialize(null);
    return res.json({ success: true, message: 'WhatsApp QR initialization triggered.', data: status });
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const status = await whatsappClient.disconnect();
    return res.json({ success: true, message: 'WhatsApp disconnected.', data: status });
  } catch (err) {
    next(err);
  }
}

async function resetSession(req, res, next) {
  try {
    const status = await whatsappClient.resetSession();
    return res.json({ success: true, message: 'WhatsApp session cache cleared.', data: status });
  } catch (err) {
    next(err);
  }
}

async function pairPhone(req, res, next) {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }
    const result = await whatsappClient.requestPairingCode(phoneNumber);
    return res.json({
      success: true,
      message: 'Pairing code generated successfully.',
      pairingCode: result.pairingCode,
      phoneNumber: result.phoneNumber
    });
  } catch (err) {
    next(err);
  }
}

async function getQr(req, res) {
  const status = whatsappClient.getStatus();
  return res.json({
    success: true,
    hasQr: status.hasQr,
    qrDataUrl: status.qrDataUrl,
    hasPairingCode: status.hasPairingCode,
    pairingCode: status.pairingCode,
    status: status.status
  });
}

async function getGroups(req, res, next) {
  try {
    const { enabled, category, search } = req.query;
    const groups = await groupManager.getAllGroups({ enabled, category, search });
    return res.json({ success: true, count: groups.length, groups });
  } catch (err) {
    next(err);
  }
}

async function syncGroups(req, res, next) {
  try {
    const synced = await groupManager.syncGroupsFromWhatsApp();
    return res.json({
      success: true,
      message: `Successfully synchronized ${synced.length} WhatsApp groups.`,
      groups: synced
    });
  } catch (err) {
    next(err);
  }
}

async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await groupManager.updateGroupSettings(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }
    return res.json({ success: true, group: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  connect,
  disconnect,
  resetSession,
  pairPhone,
  getQr,
  getGroups,
  syncGroups,
  updateGroup
};
