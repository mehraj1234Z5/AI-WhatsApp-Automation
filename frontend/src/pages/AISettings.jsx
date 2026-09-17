import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle,
  Play,
  Layers,
  Terminal
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function AISettings() {
  const { health, refreshHealth } = useSystemStatus();
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [settings, setSettings] = useState({
    ollama_url: 'http://127.0.0.1:11434',
    ollama_model: 'llama3:latest',
    duplicate_threshold_days: '30'
  });
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  // Playground state
  const [testPrompt, setTestPrompt] = useState('Explain SQL window functions (ROW_NUMBER vs RANK) for beginners with a quick table query.');
  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);

  const fetchAIConfig = async () => {
    try {
      setLoadingModels(true);
      const [modelsRes, settingsRes] = await Promise.all([
        api.get('/ollama/models'),
        api.get('/settings')
      ]);

      if (modelsRes.data.success) {
        setModels(modelsRes.data.models);
      }
      if (settingsRes.data.success && settingsRes.data.settings) {
        const s = settingsRes.data.settings;
        setSettings({
          ollama_url: s.ollama_url?.value || 'http://127.0.0.1:11434',
          ollama_model: s.ollama_model?.value || 'llama3:latest',
          duplicate_threshold_days: s.duplicate_threshold_days?.value || '30'
        });
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchAIConfig();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const res = await api.put('/settings', { settings });
      if (res.data.success) {
        setFeedback({ type: 'success', text: 'AI and model configuration saved successfully.' });
        await refreshHealth();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrompt = async () => {
    try {
      setTesting(true);
      setTestResponse(null);
      const res = await api.post('/ollama/test', {
        prompt: testPrompt,
        model: settings.ollama_model,
        system: 'You are an AI assistant specialized in creating WhatsApp educational posts with formatting and emojis.'
      });
      if (res.data.success) {
        setTestResponse(res.data.data);
      }
    } catch (err) {
      setTestResponse({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>Ollama & Local AI Configuration</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Connect to local Ollama LLMs, select active models, adjust duplicate thresholds, and test prompt generation.
          </p>
        </div>

        <button onClick={fetchAIConfig} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} />
          <span>Reload Models</span>
        </button>
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
        {/* Model Configuration Form */}
        <Card title="Model Selection & Ollama Connection">
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Ollama REST Endpoint URL</label>
              <input
                type="text"
                value={settings.ollama_url}
                onChange={(e) => setSettings({ ...settings, ollama_url: e.target.value })}
                className="form-input"
                placeholder="http://127.0.0.1:11434"
                required
              />
              <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Ollama runs locally on port 11434 and is never exposed to the public internet.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Active Generation Model</label>
              {loadingModels ? (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Detecting local models...</div>
              ) : models.length > 0 ? (
                <select
                  value={settings.ollama_model}
                  onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                  className="form-select"
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={settings.ollama_model}
                  onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                  className="form-input"
                  placeholder="llama3:latest"
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Duplicate Prevention Window (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.duplicate_threshold_days}
                onChange={(e) => setSettings({ ...settings, duplicate_threshold_days: e.target.value })}
                className="form-input"
              />
              <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Looks back across recent posts to prevent repeating the same concepts or angles.
              </span>
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <CheckCircle size={16} />
              <span>{saving ? 'Saving...' : 'Save AI Configuration'}</span>
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF', marginBottom: '0.5rem' }}>Detected Local Models</h4>
            {models.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>No models found. Run <code style={{ color: '#10B981' }}>ollama pull llama3</code> in terminal.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {models.map(m => (
                  <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: '#FFF' }}>{m.name}</span>
                    <span className="text-muted font-mono">{(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Live LLM Playground */}
        <Card title="Interactive LLM Test Playground">
          <div className="form-group">
            <label className="form-label">Test Prompt</label>
            <textarea
              rows={4}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="form-textarea"
              placeholder="Enter any prompt to test the model output..."
            />
          </div>

          <button
            onClick={handleTestPrompt}
            disabled={testing || health.ollama === 'OFFLINE'}
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: '1.25rem' }}
          >
            <Play size={16} />
            <span>{testing ? 'Streaming Generation...' : 'Execute Test Run'}</span>
          </button>

          {testResponse && (
            <div style={{ backgroundColor: '#0A0F1D', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>
                  Model: {testResponse.model}
                </span>
                {testResponse.evalCount && (
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {testResponse.evalCount} tokens
                  </span>
                )}
              </div>

              {testResponse.error ? (
                <div style={{ color: '#F87171', fontSize: '0.85rem' }}>Error: {testResponse.error}</div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: '#E2E8F0', maxHeight: '280px', overflowY: 'auto' }}>
                  {testResponse.content}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
