const db = require('../../database/db');
const ollamaService = require('../../agent/generator/ollama');
const whatsappClient = require('../../whatsapp/client/whatsappClient');
const schedulerEngine = require('../../agent/scheduler/schedulerEngine');

async function getHealth(req, res) {
  const healthReport = {
    timestamp: new Date().toISOString(),
    backend: 'OK',
    database: 'UNKNOWN',
    ollama: 'UNKNOWN',
    aiModel: 'UNKNOWN',
    whatsapp: 'UNKNOWN',
    scheduler: 'UNKNOWN',
    emergencyStop: false
  };

  // 1. Database check
  try {
    const dbCheck = await db.get('SELECT 1 as connected');
    healthReport.database = dbCheck && dbCheck.connected === 1 ? 'OK' : 'ERROR';
  } catch (e) {
    healthReport.database = 'OFFLINE: ' + e.message;
  }

  // 2. Ollama check
  try {
    const ollamaHealth = await ollamaService.checkHealth();
    healthReport.ollama = ollamaHealth.connected ? 'OK' : 'OFFLINE';
    healthReport.ollamaDetails = ollamaHealth;

    const modelSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['ollama_model']);
    const targetModel = modelSetting ? modelSetting.value : 'llama3:latest';
    const isModelFound = ollamaHealth.availableModels && ollamaHealth.availableModels.some(m => m === targetModel || m.startsWith(targetModel));
    healthReport.aiModel = isModelFound ? `OK (${targetModel})` : `MISSING (${targetModel})`;
  } catch (e) {
    healthReport.ollama = 'OFFLINE';
    healthReport.aiModel = 'UNAVAILABLE';
  }

  // 3. WhatsApp check
  try {
    const waStatus = whatsappClient.getStatus();
    healthReport.whatsapp = waStatus.status; // READY, DISCONNECTED, QR_READY, etc.
    healthReport.whatsappConnected = waStatus.connected;
  } catch (e) {
    healthReport.whatsapp = 'ERROR';
  }

  // 4. Scheduler check
  try {
    const schedStatus = schedulerEngine.getStatus();
    healthReport.scheduler = schedStatus.isRunning ? 'RUNNING' : 'STOPPED';
    healthReport.activeJobs = schedStatus.activeJobsCount;
  } catch (e) {
    healthReport.scheduler = 'ERROR';
  }

  // 5. Emergency Stop check
  try {
    const stopSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['emergency_stop']);
    healthReport.emergencyStop = stopSetting && stopSetting.value === 'true';
  } catch (e) {
    healthReport.emergencyStop = false;
  }

  return res.json({
    success: true,
    status: healthReport.backend === 'OK' && healthReport.database === 'OK' ? 'healthy' : 'degraded',
    data: healthReport
  });
}

async function getSettings(req, res, next) {
  try {
    const rows = await db.all('SELECT * FROM settings ORDER BY key ASC');
    const settingsMap = {};
    for (const row of rows) {
      settingsMap[row.key] = {
        value: row.value,
        description: row.description,
        updated_at: row.updated_at
      };
    }
    return res.json({ success: true, settings: settingsMap });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body; // { key: value, ... }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object is required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
      if (existing) {
        await db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [String(value), key]);
      } else {
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
      }
    }

    // If schedule or timer related, reload scheduler
    if (settings.emergency_stop !== undefined || settings.auto_send_enabled !== undefined) {
      await schedulerEngine.reloadSchedules();
    }

    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function toggleEmergencyStop(req, res, next) {
  try {
    const current = await db.get('SELECT value FROM settings WHERE key = ?', ['emergency_stop']);
    const isStopped = current && current.value === 'true';
    const nextState = isStopped ? 'false' : 'true';

    await db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [nextState, 'emergency_stop']);
    await schedulerEngine.reloadSchedules();

    console.warn(`[Emergency Stop] Global automation killswitch is now ${nextState === 'true' ? 'ACTIVE (STOPPED)' : 'DEACTIVATED (RUNNING)'}`);

    return res.json({
      success: true,
      message: `Emergency Stop is now ${nextState === 'true' ? 'ACTIVE' : 'DEACTIVATED'}.`,
      emergencyStop: nextState === 'true'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth,
  getSettings,
  updateSettings,
  toggleEmergencyStop
};
