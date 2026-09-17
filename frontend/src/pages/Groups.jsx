import React, { useState, useEffect } from 'react';
import {
  Users,
  RefreshCw,
  Search,
  Settings,
  Send,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Sliders
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import WhatsAppPreview from '../components/WhatsAppPreview';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function Groups() {
  const { health } = useSystemStatus();
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testMessageText, setTestMessageText] = useState('🎓 *Welcome to Daily AI Insights!*\n\nThis is a verified test message sent from your AI WhatsApp Automation system.\n\n_Powered by Local Ollama & Node.js_ 🚀');
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/whatsapp/groups');
      if (res.data.success) {
        setGroups(res.data.groups);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, []);

  const handleSyncGroups = async () => {
    try {
      setSyncing(true);
      setFeedback(null);
      const res = await api.post('/whatsapp/sync-groups');
      if (res.data.success) {
        setFeedback({ type: 'success', text: res.data.message });
        await fetchGroups();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleEnabled = async (group) => {
    try {
      const nextEnabled = group.enabled ? 0 : 1;
      await api.put(`/whatsapp/groups/${group.id}`, { enabled: nextEnabled });
      setGroups(groups.map(g => g.id === group.id ? { ...g, enabled: nextEnabled } : g));
    } catch (err) {
      alert(`Failed to update group: ${err.message}`);
    }
  };

  const handleSaveGroupConfig = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      const res = await api.put(`/whatsapp/groups/${selectedGroup.id}`, selectedGroup);
      if (res.data.success) {
        setGroups(groups.map(g => g.id === selectedGroup.id ? res.data.group : g));
        setIsEditModalOpen(false);
        setFeedback({ type: 'success', text: `Saved settings for "${selectedGroup.group_name}".` });
      }
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleSendTest = async () => {
    if (!selectedGroup) return;
    try {
      setSendingTest(true);
      setFeedback(null);
      const res = await api.post('/messages/test', {
        groupId: selectedGroup.id,
        messageText: testMessageText
      });
      if (res.data.success) {
        setIsTestModalOpen(false);
        setFeedback({ type: 'success', text: `Test message successfully sent to "${selectedGroup.group_name}"!` });
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.group_name.toLowerCase().includes(search.toLowerCase()) ||
    (g.topic && g.topic.toLowerCase().includes(search.toLowerCase())) ||
    (g.category && g.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>WhatsApp Target Groups</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Auto-detected groups from your WhatsApp session. Configure tailored topics and schedules for each group.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSyncGroups}
            disabled={syncing || !health.whatsappConnected}
            className="btn btn-primary"
            title={!health.whatsappConnected ? 'Connect WhatsApp first' : 'Fetch live groups'}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Groups from WhatsApp'}</span>
          </button>
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

      {/* Search Bar */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search groups by name, category, or topic..."
          />
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
          Showing <strong>{filteredGroups.length}</strong> of {groups.length} groups
        </div>
      </div>

      {/* Groups Table */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Users size={36} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 600, color: '#FFF' }}>No WhatsApp Groups Found</div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
              Connect your WhatsApp account in the <strong>WhatsApp</strong> tab and click "Sync Groups from WhatsApp".
            </p>
            {health.whatsappConnected && (
              <button onClick={handleSyncGroups} disabled={syncing} className="btn btn-primary btn-sm">
                Sync Groups Now
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Group Name</th>
                  <th>Category</th>
                  <th>Audience</th>
                  <th>Topic</th>
                  <th>Content Type</th>
                  <th>Schedule</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <button
                        onClick={() => handleToggleEnabled(group)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title={group.enabled ? 'Click to disable automation' : 'Click to enable automation'}
                      >
                        {group.enabled ? (
                          <span className="badge badge-success">Enabled</span>
                        ) : (
                          <span className="badge badge-offline">Disabled</span>
                        )}
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#FFF' }}>{group.group_name}</div>
                      <div className="text-muted font-mono" style={{ fontSize: '0.7rem' }}>
                        {group.participant_count > 0 ? `${group.participant_count} members • ` : ''}{group.whatsapp_group_id}
                      </div>
                    </td>
                    <td><span className="badge badge-info">{group.category}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{group.audience}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{group.topic}</td>
                    <td style={{ fontSize: '0.85rem' }}>{group.content_type}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {group.posting_time} ({group.frequency})
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setSelectedGroup({ ...group });
                            setIsEditModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Configure AI Topic & Settings"
                        >
                          <Sliders size={14} />
                          <span>Configure</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGroup({ ...group });
                            setIsTestModalOpen(true);
                          }}
                          className="btn btn-primary btn-sm"
                          title="Send Safe Test Message"
                        >
                          <Send size={14} />
                          <span>Test</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Group Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Configure Group: ${selectedGroup?.group_name}`}
        maxWidth="680px"
      >
        {selectedGroup && (
          <form onSubmit={handleSaveGroupConfig}>
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={selectedGroup.category}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, category: e.target.value })}
                  className="form-select"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Audience</label>
                <select
                  value={selectedGroup.audience}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, audience: e.target.value })}
                  className="form-select"
                >
                  <option value="Data Analytics Students">Data Analytics Students</option>
                  <option value="Fresh Graduates">Fresh Graduates</option>
                  <option value="Digital Marketing Students">Digital Marketing Students</option>
                  <option value="Working Professionals">Working Professionals</option>
                  <option value="Trainers">Trainers</option>
                  <option value="General Technology Audience">General Technology Audience</option>
                </select>
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Content Type</label>
                <select
                  value={selectedGroup.content_type}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, content_type: e.target.value })}
                  className="form-select"
                >
                  <option value="Daily Tip">Daily Tip</option>
                  <option value="Educational Post">Educational Post</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Interview Question">Interview Question</option>
                  <option value="Daily Challenge">Daily Challenge</option>
                  <option value="Career Tip">Career Tip</option>
                  <option value="Industry Update">Industry Update</option>
                  <option value="Question of the Day">Question of the Day</option>
                  <option value="Course Promotion">Course Promotion</option>
                  <option value="Announcement">Announcement</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tone</label>
                <select
                  value={selectedGroup.tone}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, tone: e.target.value })}
                  className="form-select"
                >
                  <option value="Professional & Engaging">Professional & Engaging</option>
                  <option value="Casual & Friendly">Casual & Friendly</option>
                  <option value="Technical & In-Depth">Technical & In-Depth</option>
                  <option value="Inspirational & Motivating">Inspirational & Motivating</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Topic / Focus Area</label>
              <input
                type="text"
                value={selectedGroup.topic}
                onChange={(e) => setSelectedGroup({ ...selectedGroup, topic: e.target.value })}
                className="form-input"
                placeholder="e.g., SQL Window Functions, DAX Measures, Pandas EDA"
                required
              />
            </div>

            <div className="grid-cols-3">
              <div className="form-group">
                <label className="form-label">Language</label>
                <input
                  type="text"
                  value={selectedGroup.language}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, language: e.target.value })}
                  className="form-input"
                  placeholder="English"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Posting Time (HH:mm)</label>
                <input
                  type="time"
                  value={selectedGroup.posting_time}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, posting_time: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  value={selectedGroup.frequency}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, frequency: e.target.value })}
                  className="form-select"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekdays">Weekdays (Mon-Fri)</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Test Message Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Send Safe Test Message to "${selectedGroup?.group_name}"`}
        maxWidth="640px"
      >
        <div>
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#93C5FD' }}>
            ℹ️ Safe Test Sender: Message will only be dispatched to <strong>{selectedGroup?.group_name}</strong>. Other groups will not receive anything.
          </div>

          <div className="form-group">
            <label className="form-label">Test Message Body (WhatsApp Markdown Supported)</label>
            <textarea
              rows={5}
              value={testMessageText}
              onChange={(e) => setTestMessageText(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">WhatsApp Live Bubble Preview</label>
            <WhatsAppPreview text={testMessageText} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="button" onClick={() => setIsTestModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !health.whatsappConnected}
              className="btn btn-primary"
            >
              <Send size={16} />
              <span>{sendingTest ? 'Sending...' : 'Send Test Message'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
