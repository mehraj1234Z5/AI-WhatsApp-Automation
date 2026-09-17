import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Cloud,
  CheckCircle,
  AlertTriangle,
  Server,
  Zap
} from 'lucide-react';
import { Card } from '../components/Card';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function Settings() {
  const { health, refreshHealth, toggleEmergencyStop } = useSystemStatus();
  const [settings, setSettings] = useState({
    emergency_stop: 'false',
    auto_send_enabled: 'false',
    max_messages_per_hour: '30',
    min_delay_between_messages_sec: '15',
    max_retries: '3',
    retry_delay_sec: '30'
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Password update form
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success && res.data.settings) {
        const s = res.data.settings;
        setSettings({
          emergency_stop: s.emergency_stop?.value || 'false',
          auto_send_enabled: s.auto_send_enabled?.value || 'false',
          max_messages_per_hour: s.max_messages_per_hour?.value || '30',
          min_delay_between_messages_sec: s.min_delay_between_messages_sec?.value || '15',
          max_retries: s.max_retries?.value || '3',
          retry_delay_sec: s.retry_delay_sec?.value || '30'
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setFeedback(null);
      const res = await api.put('/settings', { settings });
      if (res.data.success) {
        setFeedback({ type: 'success', text: 'Safety parameters and system settings updated.' });
        await refreshHealth();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordFeedback({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }
    try {
      setUpdatingPassword(true);
      setPasswordFeedback(null);
      const res = await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data.success) {
        setPasswordFeedback({ type: 'success', text: 'Password successfully updated.' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordFeedback({ type: 'danger', text: err.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>System Safety & Cloudflare Tunnel Settings</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Configure rate limits, emergency stop killswitch, admin credentials, and Cloudflare integration.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: feedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: feedback.type === 'success' ? '#34D399' : '#F87171'
        }}>
          {feedback.text}
        </div>
      )}

      <div className="grid-cols-2">
        {/* Safety & Automation Controls */}
        <Card title="WhatsApp Safety Controls & Rate Limits">
          <form onSubmit={handleSaveSettings}>
            {/* Automation Mode Toggle */}
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>Automatic Send Mode</strong>
                  <p className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    When enabled, scheduled posts are sent directly to WhatsApp. When disabled, they are saved as drafts for manual review.
                  </p>
                </div>
                <select
                  value={settings.auto_send_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_send_enabled: e.target.value })}
                  className="form-select"
                  style={{ width: 'auto', minWidth: '140px' }}
                >
                  <option value="false">Manual Review</option>
                  <option value="true">Auto-Send</option>
                </select>
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Max Messages Per Hour</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_messages_per_hour}
                  onChange={(e) => setSettings({ ...settings, max_messages_per_hour: e.target.value })}
                  className="form-input"
                />
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Anti-spam hourly threshold</span>
              </div>

              <div className="form-group">
                <label className="form-label">Min Delay Between Messages (Sec)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.min_delay_between_messages_sec}
                  onChange={(e) => setSettings({ ...settings, min_delay_between_messages_sec: e.target.value })}
                  className="form-input"
                />
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Throttles consecutive dispatches</span>
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Max Retries on Failure</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.max_retries}
                  onChange={(e) => setSettings({ ...settings, max_retries: e.target.value })}
                  className="form-input"
                />
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Maximum retry attempts</span>
              </div>

              <div className="form-group">
                <label className="form-label">Retry Delay (Sec)</label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={settings.retry_delay_sec}
                  onChange={(e) => setSettings({ ...settings, retry_delay_sec: e.target.value })}
                  className="form-input"
                />
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Backoff pause between retries</span>
              </div>
            </div>

            <button type="submit" disabled={savingSettings} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <CheckCircle size={16} />
              <span>{savingSettings ? 'Saving...' : 'Save Safety Limits'}</span>
            </button>
          </form>
        </Card>

        {/* Security & Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card title="Admin Account Security">
            {passwordFeedback && (
              <div style={{
                padding: '0.6rem 0.85rem',
                backgroundColor: passwordFeedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: passwordFeedback.type === 'success' ? '#34D399' : '#F87171'
              }}>
                {passwordFeedback.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={updatingPassword} className="btn btn-secondary" style={{ width: '100%' }}>
                <Lock size={15} />
                <span>{updatingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </Card>

          {/* Cloudflare Tunnel Setup Guide */}
          <Card title="Cloudflare Tunnel & Remote Access">
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                To host the React dashboard on <strong>Cloudflare Pages</strong> while keeping the Node.js backend safely on your local machine:
              </p>
              <div style={{ backgroundColor: '#0B0F19', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#10B981' }}>
                cloudflared tunnel --url http://localhost:5000
              </div>
              <p style={{ fontSize: '0.78rem' }}>
                Set the generated tunnel URL as your frontend's <code style={{ color: '#FFF' }}>VITE_API_URL</code> environment variable in Cloudflare Pages.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
