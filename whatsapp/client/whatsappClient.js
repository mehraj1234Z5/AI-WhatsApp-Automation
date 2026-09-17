const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

class WhatsAppManager {
  constructor() {
    this.sock = null;
    this.status = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, PAIRING_CODE_READY, AUTHENTICATED, READY, FAILURE
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.pairingCode = null;
    this.pairingPhone = null;
    this.lastConnectedAt = null;
    this.errorMessage = null;
    this.sessionInfo = null;
    this.isStarting = false;
    this.saveCreds = null;
    this.isExplicitlyDisconnected = false;
  }

  getStatus() {
    return {
      status: this.status,
      connected: this.status === 'READY',
      lastConnectedAt: this.lastConnectedAt,
      hasQr: !!this.qrDataUrl,
      qrDataUrl: this.qrDataUrl,
      hasPairingCode: !!this.pairingCode,
      pairingCode: this.pairingCode,
      pairingPhone: this.pairingPhone,
      errorMessage: this.errorMessage,
      sessionInfo: this.sessionInfo
    };
  }

  async initialize(targetPhoneNumber = null) {
    if (this.status === 'READY') {
      console.log('[WhatsApp] Client is already connected and ready.');
      return this.getStatus();
    }

    if (this.isStarting) {
      console.log('[WhatsApp] Connection initialization already in progress...');
      return this.getStatus();
    }

    this.isStarting = true;
    this.isExplicitlyDisconnected = false;
    this.status = 'INITIALIZING';
    this.errorMessage = null;
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.pairingCode = null;

    // Reset or set pairingPhone based on invocation
    this.pairingPhone = targetPhoneNumber ? targetPhoneNumber.replace(/[^\d]/g, '') : null;

    // Cleanly close existing socket if any
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners();
        this.sock.end(undefined);
      } catch (e) {
        // ignore
      }
      this.sock = null;
    }

    const sessionPath = path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth');
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    console.log(`[WhatsApp] Initializing native WhatsApp Web connection at: ${sessionPath} (Mode: ${this.pairingPhone ? 'Phone Pairing' : 'QR Scanner'})`);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      this.saveCreds = saveCreds;

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Safari'),
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
        syncFullHistory: false
      });

      this._setupListeners();
      this.isStarting = false;
    } catch (err) {
      console.error('[WhatsApp Init Error]:', err.message);
      this.status = 'FAILURE';
      this.errorMessage = err.message;
      this.isStarting = false;
    }

    return this.getStatus();
  }

  _setupListeners() {
    if (!this.sock) return;

    this.sock.ev.on('creds.update', () => {
      if (this.saveCreds) {
        this.saveCreds();
      }
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // 1. Handle Phone Pairing Code if requested
      if (qr && this.pairingPhone && !this.sock?.authState?.creds?.registered) {
        try {
          console.log(`[WhatsApp] Requesting pairing code for phone number: ${this.pairingPhone}`);
          const code = await this.sock.requestPairingCode(this.pairingPhone);
          const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
          this.pairingCode = formattedCode;
          this.status = 'PAIRING_CODE_READY';
          this.qrDataUrl = null;
          this.errorMessage = null;
          console.log(`[WhatsApp] >>> PAIRING CODE GENERATED: ${formattedCode} <<<`);
          return;
        } catch (err) {
          console.error('[WhatsApp] Pairing code error:', err.message);
          this.errorMessage = `Phone pairing error: ${err.message}`;
        }
      }

      // 2. Handle Visual QR Code
      if (qr && !this.pairingPhone) {
        console.log('[WhatsApp] QR code generated successfully. Rendering visual scanner...');
        this.status = 'QR_READY';
        this.qrRaw = qr;
        try {
          this.qrDataUrl = await qrcode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#111827',
              light: '#FFFFFF'
            }
          });
          this.errorMessage = null;
        } catch (err) {
          console.error('[WhatsApp] QR render error:', err.message);
        }
      }

      if (connection === 'connecting') {
        if (this.status !== 'QR_READY' && this.status !== 'PAIRING_CODE_READY') {
          this.status = 'INITIALIZING';
        }
      }

      if (connection === 'open') {
        console.log('[WhatsApp] Client successfully authenticated and connected!');
        this.status = 'READY';
        this.lastConnectedAt = new Date().toISOString();
        this.qrRaw = null;
        this.qrDataUrl = null;
        this.pairingCode = null;
        this.pairingPhone = null;
        this.errorMessage = null;

        const user = this.sock.user;
        if (user) {
          this.sessionInfo = {
            pushname: user.name || user.notify || 'WhatsApp User',
            wid: user.id ? user.id.split(':')[0] : null,
            platform: 'WhatsApp Multi-Device'
          };
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !this.isExplicitlyDisconnected;
        console.warn(`[WhatsApp] Connection closed. Status code: ${statusCode}, Should Reconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          this.status = 'DISCONNECTED';
          this.errorMessage = null;
          this.sessionInfo = null;
          this.qrRaw = null;
          this.qrDataUrl = null;
          this.pairingCode = null;
          this.pairingPhone = null;
          // Clear session files so next connect is clean
          const sessionPath = path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth');
          try {
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
          } catch (e) {
            // ignore
          }
        } else if (statusCode === DisconnectReason.restartRequired) {
          console.log('[WhatsApp] Restart required by protocol handshake. Re-initializing...');
          setTimeout(() => {
            this.initialize(this.pairingPhone).catch(e => console.warn('[WhatsApp] Reconnect notice:', e.message));
          }, 1000);
        } else if (shouldReconnect) {
          console.log('[WhatsApp] Auto-reconnecting socket...');
          setTimeout(() => {
            if (!this.isExplicitlyDisconnected && this.status !== 'READY') {
              this.initialize(this.pairingPhone).catch(e => console.warn('[WhatsApp] Reconnect notice:', e.message));
            }
          }, 2000);
        } else {
          this.status = 'DISCONNECTED';
        }
      }
    });
  }

  async requestPairingCode(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required for pairing code.');
    }

    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    if (cleanNumber.length < 8) {
      throw new Error('Please enter a valid phone number with country code (e.g. 919876543210).');
    }

    console.log(`[WhatsApp] Initiating fresh phone number pairing for +${cleanNumber}`);
    this.pairingPhone = cleanNumber;
    this.pairingCode = null;
    this.qrDataUrl = null;
    this.errorMessage = null;

    // Reset old socket & clean unregistered cache for fresh code
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (e) {
        // ignore
      }
      this.sock = null;
    }

    const sessionPath = path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth');
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore
    }

    await this.initialize(cleanNumber);

    // Wait for pairing code to be generated
    let attempts = 0;
    while (!this.pairingCode && attempts < 40) {
      await new Promise(r => setTimeout(r, 250));
      attempts++;
    }

    if (!this.pairingCode) {
      throw new Error('Timed out waiting for pairing code from WhatsApp. Please check your phone number and try again.');
    }

    return {
      success: true,
      phoneNumber: cleanNumber,
      pairingCode: this.pairingCode,
      status: this.status
    };
  }

  async disconnect() {
    console.log('[WhatsApp] Disconnecting socket...');
    this.isExplicitlyDisconnected = true;
    try {
      if (this.sock) {
        this.sock.end(undefined);
      }
    } catch (err) {
      console.warn('[WhatsApp] Error closing socket:', err.message);
    } finally {
      this.sock = null;
      this.status = 'DISCONNECTED';
      this.qrRaw = null;
      this.qrDataUrl = null;
      this.pairingCode = null;
      this.pairingPhone = null;
      this.isStarting = false;
      this.errorMessage = null;
    }
    return this.getStatus();
  }

  async resetSession() {
    console.log('[WhatsApp] Resetting session cache...');
    await this.disconnect();
    const sessionPath = path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth');
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[WhatsApp] Deleted session folder at: ${sessionPath}`);
      }
    } catch (err) {
      console.warn('[WhatsApp] Error deleting session folder:', err.message);
    }
    this.errorMessage = null;
    return this.getStatus();
  }

  async getGroups() {
    if (this.status !== 'READY' || !this.sock) {
      throw new Error('WhatsApp client is not connected. Please authenticate first.');
    }

    try {
      const groupsMap = await this.sock.groupFetchAllParticipating();
      const groupsList = Object.values(groupsMap);

      return groupsList.map((g) => ({
        id: g.id,
        name: g.subject || 'Unnamed Group',
        participantCount: g.participants ? g.participants.length : 0,
        isReadOnly: g.announce || false,
        unreadCount: 0
      }));
    } catch (err) {
      console.error('[WhatsApp] Failed to fetch participating groups:', err.message);
      throw new Error(`Failed to fetch groups: ${err.message}`);
    }
  }

  async sendMessage(whatsappGroupId, messageText) {
    if (this.status !== 'READY' || !this.sock) {
      throw new Error('WhatsApp client is not connected. Cannot send message.');
    }

    if (!whatsappGroupId) {
      throw new Error('WhatsApp Group ID is required.');
    }

    if (!messageText || messageText.trim().length === 0) {
      throw new Error('Message content cannot be empty.');
    }

    let jid = whatsappGroupId;
    if (!jid.includes('@')) {
      jid = `${jid}@g.us`;
    }

    const result = await this.sock.sendMessage(jid, { text: messageText.trim() });
    return {
      success: true,
      messageId: result?.key?.id || null,
      timestamp: result?.messageTimestamp || Date.now()
    };
  }
}

// Singleton instance
const whatsappInstance = new WhatsAppManager();

module.exports = whatsappInstance;
