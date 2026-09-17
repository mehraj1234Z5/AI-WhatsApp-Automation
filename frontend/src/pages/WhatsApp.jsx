import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle,
  RefreshCw,
  Power,
  Smartphone,
  Shield,
  Trash2,
  Copy,
  Check,
  PhoneCall,
  KeyRound,
  ArrowRight,
  Info,
  AlertCircle,
  X
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function WhatsApp() {
  const { refreshHealth } = useSystemStatus();
  const [waState, setWaState] = useState({
    status: 'DISCONNECTED',
    connected: false,
    hasQr: false,
    qrDataUrl: null,
    hasPairingCode: false,
    pairingCode: null,
    pairingPhone: null,
    errorMessage: null,
    sessionInfo: null,
    lastConnectedAt: null
  });

  const [activeTab, setActiveTab] = useState('phone'); // 'phone' or 'qr'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      if (res.data.success) {
        setWaState(res.data.data);
      }
    } catch (err) {
      console.error('Failed to get WA status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActionMsg(null);
    setDismissedError(true);
  };

  const handleConnectQR = async () => {
    try {
      setLoading(true);
      setDismissedError(false);
      setActionMsg('Connecting to WhatsApp socket & requesting QR code scanner...');
      await api.post('/whatsapp/connect');
      await fetchStatus();
      await refreshHealth();
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPairingCode = async (e) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    if (!cleaned || cleaned.length < 8) {
      alert('Please enter your full phone number including country code (e.g. +91 9876543210 or 919876543210)');
      return;
    }

    try {
      setPairingLoading(true);
      setDismissedError(false);
      setActionMsg('Requesting 8-character pairing code from WhatsApp servers...');
      const res = await api.post('/whatsapp/pair-phone', {
        phoneNumber: cleaned
      });

      if (res.data.success) {
        setActionMsg('Pairing code generated! Type this code on your phone now.');
        await fetchStatus();
        await refreshHealth();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionMsg(`Pairing error: ${msg}`);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (waState.pairingCode) {
      navigator.clipboard.writeText(waState.pairingCode.replace('-', ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;
    try {
      setLoading(true);
      setActionMsg('Disconnecting WhatsApp client...');
      await api.post('/whatsapp/disconnect');
      await fetchStatus();
      await refreshHealth();
      setActionMsg('WhatsApp disconnected successfully.');
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!window.confirm('Resetting session will clear local saved session and allow a fresh connection. Proceed?')) return;
    try {
      setLoading(true);
      setActionMsg('Clearing session cache and restarting client...');
      await api.post('/whatsapp/reset');
      await fetchStatus();
      await refreshHealth();
      setActionMsg('Session cache cleared. You can now pair with Phone Number or QR.');
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>WhatsApp Connection Hub</span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: waState.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: waState.connected ? '#10B981' : '#EF4444', fontWeight: 700, border: `1px solid ${waState.connected ? '#10B981' : '#EF4444'}` }}>
              {waState.connected ? 'ACTIVE' : 'DISCONNECTED'}
            </span>
          </h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Choose either <strong>Phone Number (Pairing Code)</strong> or <strong>QR Code Scanner</strong> to link your device.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchStatus} className="btn btn-secondary btn-sm" title="Refresh connection status">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={handleResetSession} disabled={loading} className="btn btn-secondary btn-sm" title="Clear session cache and restart">
            <Trash2 size={15} />
            <span>Reset Session</span>
          </button>
          {waState.connected && (
            <button onClick={handleDisconnect} disabled={loading} className="btn btn-danger-outline btn-sm">
              <Power size={16} />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: '#93C5FD',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: 'transparent', border: 'none', color: '#93C5FD', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Connected Success View */}
      {waState.connected ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#10B981', border: '2px solid #10B981' }}>
              <CheckCircle size={44} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>WhatsApp Connected Successfully!</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.35rem', maxWidth: '520px', margin: '0.35rem auto 1.5rem' }}>
              Your session is saved persistently in <code style={{ color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>.wwebjs_auth/</code>. Automation will run even if you close this dashboard.
            </p>

            {waState.sessionInfo && (
              <div style={{ padding: '1.25rem 2rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', display: 'inline-block', textAlign: 'left', fontSize: '0.9rem', border: '1px solid var(--border-color)', minWidth: '320px' }}>
                <div style={{ marginBottom: '0.45rem' }}><strong style={{ color: '#9CA3AF' }}>Account Name:</strong> <span style={{ color: '#FFF', fontWeight: 600 }}>{waState.sessionInfo.pushname || 'WhatsApp User'}</span></div>
                <div style={{ marginBottom: '0.45rem' }}><strong style={{ color: '#9CA3AF' }}>Phone JID:</strong> <span style={{ color: '#FFF', fontWeight: 600 }}>{waState.sessionInfo.wid || 'Verified'}</span></div>
                <div><strong style={{ color: '#9CA3AF' }}>Protocol:</strong> <span style={{ color: '#10B981', fontWeight: 600 }}>{waState.sessionInfo.platform || 'Multi-Device Native'}</span></div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => window.location.href = '/groups'} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                <span>Configure Target Groups →</span>
              </button>
              <button onClick={handleDisconnect} className="btn btn-danger-outline" style={{ padding: '0.75rem 1.5rem' }}>
                Disconnect Session
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid-cols-2">
          {/* Pairing Methods Card */}
          <Card>
            {/* Method Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <button
                onClick={() => handleTabChange('phone')}
                className={`btn btn-sm ${activeTab === 'phone' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.65rem', fontWeight: activeTab === 'phone' ? 700 : 500 }}
              >
                <PhoneCall size={16} />
                <span>Pair with Phone Number</span>
              </button>
              <button
                onClick={() => handleTabChange('qr')}
                className={`btn btn-sm ${activeTab === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.65rem', fontWeight: activeTab === 'qr' ? 700 : 500 }}
              >
                <QrCode size={16} />
                <span>QR Code Scanner</span>
              </button>
            </div>

            {/* TAB 1: Phone Number Pairing Code */}
            {activeTab === 'phone' && (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF' }}>
                    Method 1: Enter Phone Number
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    Receive an 8-character code to type directly into your WhatsApp app.
                  </p>
                </div>

                <form onSubmit={handleRequestPairingCode}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>WhatsApp Phone Number (with Country Code)</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 919876543210 or +91 98765 43210"
                      className="form-input"
                      style={{ fontSize: '1.05rem', padding: '0.85rem 1rem', letterSpacing: '0.02em' }}
                      required
                    />
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                      Example format: India <code>919876543210</code>, US <code>14155552671</code>, UK <code>447911123456</code>.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={pairingLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem', fontWeight: 700 }}
                  >
                    <KeyRound size={18} className={pairingLoading ? 'animate-spin' : ''} />
                    <span>{pairingLoading ? 'Requesting 8-Digit Code...' : 'Get 8-Character Pairing Code'}</span>
                  </button>
                </form>

                {/* Render 8-Character Pairing Code */}
                {waState.pairingCode && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem 1rem',
                    backgroundColor: '#070C18',
                    border: '2px solid #10B981',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      ⚡ Enter This Code in WhatsApp
                    </div>

                    <div style={{
                      fontSize: '2.6rem',
                      fontWeight: 900,
                      color: '#FFF',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                      margin: '0.85rem 0',
                      textShadow: '0 0 10px rgba(255,255,255,0.3)'
                    }}>
                      {waState.pairingCode}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={handleCopyCode}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', gap: '0.4rem', padding: '0.5rem 1rem' }}
                      >
                        {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                        <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <p className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '0.85rem' }}>
                      Open WhatsApp on phone → <strong>Linked Devices</strong> → <strong>Link with phone number</strong> → type code above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Visual QR Code */}
            {activeTab === 'qr' && (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF' }}>
                    Method 2: Scan QR Code
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    Point your phone camera at the QR code to connect instantly.
                  </p>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <button
                    onClick={handleConnectQR}
                    disabled={loading || waState.status === 'INITIALIZING'}
                    className="btn btn-primary"
                    style={{ padding: '0.85rem 1.5rem', width: '100%', fontWeight: 700 }}
                  >
                    <QrCode size={18} />
                    <span>{loading ? 'Initializing Scanner...' : 'Generate QR Code Scanner'}</span>
                  </button>
                </div>

                {waState.status === 'QR_READY' && waState.qrDataUrl && (
                  <div style={{
                    textAlign: 'center',
                    padding: '1.25rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    margin: '0 auto',
                    maxWidth: '300px',
                    boxShadow: '0 0 25px rgba(0,0,0,0.5)'
                  }}>
                    <img
                      src={waState.qrDataUrl}
                      alt="WhatsApp QR Code"
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
                    />
                    <div style={{ color: '#111827', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.85rem' }}>
                      Scan this code with WhatsApp
                    </div>
                  </div>
                )}

                {waState.status === 'INITIALIZING' && (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--accent-primary)' }} />
                    <p style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600 }}>Connecting to WhatsApp Multi-Device Socket...</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Generating fresh QR code in seconds...</p>
                  </div>
                )}
              </div>
            )}

            {waState.errorMessage && !dismissedError && (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#F87171',
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} flexShrink={0} />
                  <span><strong>Notice:</strong> {waState.errorMessage}</span>
                </div>
                <button
                  onClick={() => setDismissedError(true)}
                  style={{ background: 'transparent', border: 'none', color: '#F87171', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </Card>

          {/* Dynamic Instructions Card */}
          <Card title={activeTab === 'phone' ? 'How to Link with Phone Number (30s)' : 'How to Link with QR Scanner (15s)'}>
            {activeTab === 'phone' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Open WhatsApp on your phone</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Ensure WhatsApp is open and connected to the internet.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Go to Linked Devices</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Tap <strong>Settings</strong> (iPhone) or <strong>⋮ 3-dots</strong> (Android) → select <strong>Linked Devices</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Tap "Link a Device"</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Unlock with fingerprint, Face ID, or your phone PIN.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-success-bg)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    4
                  </div>
                  <div>
                    <strong style={{ color: '#10B981' }}>Tap "Link with phone number instead"</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Look at the bottom of your phone screen for this link option.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-success-bg)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    5
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Enter the 8-character pairing code</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Type the code generated on this screen into WhatsApp. It pairs instantly!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Open WhatsApp on your phone</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Ensure WhatsApp is open and active on your mobile device.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Go to Linked Devices</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Tap <strong>Settings</strong> (iPhone) or <strong>⋮ 3-dots</strong> (Android) → select <strong>Linked Devices</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-info-bg)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Tap "Link a Device"</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Unlock with fingerprint, Face ID, or your phone PIN.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-success-bg)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    4
                  </div>
                  <div>
                    <strong style={{ color: '#10B981' }}>Click "Generate QR Code Scanner"</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Click the green button on the left to display your QR scanner code.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-success-bg)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    5
                  </div>
                  <div>
                    <strong style={{ color: '#FFF' }}>Scan the QR Code with your camera</strong>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Point your phone camera at the QR code. Your session will pair in seconds!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
