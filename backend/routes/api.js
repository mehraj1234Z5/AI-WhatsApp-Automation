const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');

const authController = require('../controllers/authController');
const whatsappController = require('../controllers/whatsappController');
const ollamaController = require('../controllers/ollamaController');
const contentController = require('../controllers/contentController');
const scheduleController = require('../controllers/scheduleController');
const messageController = require('../controllers/messageController');
const logsController = require('../controllers/logsController');
const settingsController = require('../controllers/settingsController');
const categoryController = require('../controllers/categoryController');

// 1. System Health (Public for monitoring / Cloudflare checks)
router.get('/health', settingsController.getHealth);

// 2. Authentication
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);
router.post('/auth/logout', authenticateToken, authController.logout);
router.put('/auth/password', authenticateToken, authController.changePassword);

// 3. WhatsApp Client Management
router.get('/whatsapp/status', authenticateToken, whatsappController.getStatus);
router.post('/whatsapp/connect', authenticateToken, whatsappController.connect);
router.post('/whatsapp/disconnect', authenticateToken, whatsappController.disconnect);
router.post('/whatsapp/reset', authenticateToken, whatsappController.resetSession);
router.post('/whatsapp/pair-phone', authenticateToken, whatsappController.pairPhone);
router.get('/whatsapp/qr', authenticateToken, whatsappController.getQr);
router.get('/whatsapp/groups', authenticateToken, whatsappController.getGroups);
router.post('/whatsapp/sync-groups', authenticateToken, whatsappController.syncGroups);
router.put('/whatsapp/groups/:id', authenticateToken, whatsappController.updateGroup);

// 4. Ollama & AI Models
router.get('/ollama/status', authenticateToken, ollamaController.getStatus);
router.get('/ollama/models', authenticateToken, ollamaController.getModels);
router.post('/ollama/test', authenticateToken, ollamaController.testPrompt);

// 5. Content Generation & Management
router.post('/content/generate', authenticateToken, contentController.generateContent);
router.get('/content', authenticateToken, contentController.getAllContent);
router.get('/content/:id', authenticateToken, contentController.getContentById);
router.put('/content/:id', authenticateToken, contentController.updateContent);
router.post('/content/:id/approve', authenticateToken, contentController.approveContent);
router.post('/content/:id/reject', authenticateToken, contentController.rejectContent);
router.post('/content/:id/send', authenticateToken, contentController.sendContentNow);

// 6. Automation Schedules
router.get('/schedules', authenticateToken, scheduleController.getAllSchedules);
router.post('/schedules', authenticateToken, scheduleController.createSchedule);
router.put('/schedules/:id', authenticateToken, scheduleController.updateSchedule);
router.delete('/schedules/:id', authenticateToken, scheduleController.deleteSchedule);
router.post('/schedules/:id/toggle', authenticateToken, scheduleController.toggleSchedule);
router.post('/schedules/:id/run-now', authenticateToken, scheduleController.runNow);

// 7. Message Dispatch (Safe test & immediate)
router.post('/messages/test', authenticateToken, messageController.testMessage);
router.post('/messages/send', authenticateToken, messageController.sendImmediate);

// 8. Logs & Statistics
router.get('/logs', authenticateToken, logsController.getLogs);
router.get('/logs/stats', authenticateToken, logsController.getStats);
router.post('/logs/clear', authenticateToken, logsController.clearLogs);

// 9. System Settings & Safety Controls
router.get('/settings', authenticateToken, settingsController.getSettings);
router.put('/settings', authenticateToken, settingsController.updateSettings);
router.post('/settings/emergency-stop', authenticateToken, settingsController.toggleEmergencyStop);

// 10. Categories & Topics
router.get('/categories', authenticateToken, categoryController.getCategories);
router.post('/categories', authenticateToken, categoryController.addCategory);
router.post('/categories/topics', authenticateToken, categoryController.addTopic);

module.exports = router;
