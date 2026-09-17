import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function Schedules() {
  const { health } = useSystemStatus();
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [runningJobId, setRunningJobId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    groupId: '',
    topic: 'SQL Window Functions & Practice',
    contentType: 'Daily Tip',
    postingTime: '09:00',
    frequency: 'Daily',
    cronExpression: '',
    enabled: 1
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schedules');
      if (res.data.success) {
        setSchedules(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/whatsapp/groups');
      if (res.data.success) {
        setGroups(res.data.groups);
        if (res.data.groups.length > 0 && !formData.groupId) {
          setFormData(prev => ({ ...prev, groupId: res.data.groups[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setFeedback(null);
      const res = await api.post('/schedules', formData);
      if (res.data.success) {
        setIsCreateModalOpen(false);
        setFeedback({ type: 'success', text: 'Schedule created and loaded into scheduler engine.' });
        await fetchSchedules();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      setFeedback(null);
      const res = await api.put(`/schedules/${selectedSchedule.id}`, {
        groupId: selectedSchedule.group_id,
        topic: selectedSchedule.topic,
        contentType: selectedSchedule.content_type,
        postingTime: selectedSchedule.posting_time,
        frequency: selectedSchedule.frequency,
        cronExpression: selectedSchedule.cron_expression,
        enabled: selectedSchedule.enabled
      });
      if (res.data.success) {
        setIsEditModalOpen(false);
        setFeedback({ type: 'success', text: 'Schedule updated.' });
        await fetchSchedules();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automated schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      setFeedback({ type: 'success', text: 'Schedule deleted.' });
      await fetchSchedules();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.post(`/schedules/${id}/toggle`);
      if (res.data.success) {
        setSchedules(schedules.map(s => s.id === id ? { ...s, enabled: res.data.enabled ? 1 : 0 } : s));
      }
    } catch (err) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleRunNow = async (id) => {
    try {
      setRunningJobId(id);
      setFeedback({ type: 'info', text: 'Executing scheduled job in background...' });
      const res = await api.post(`/schedules/${id}/run-now`);
      if (res.data.success) {
        setFeedback({ type: 'success', text: 'Schedule executed successfully! Check Logs or Content Studio.' });
        await fetchSchedules();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: `Execution error: ${err.message}` });
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>Automation Scheduler</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Set recurring daily schedules for AI generation and group posting. Operates continuously in the background.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={groups.length === 0}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Create New Schedule</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: feedback.type === 'success' ? 'var(--status-success-bg)' : feedback.type === 'info' ? 'var(--status-info-bg)' : 'var(--status-danger-bg)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : feedback.type === 'info' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: feedback.type === 'success' ? '#34D399' : feedback.type === 'info' ? '#93C5FD' : '#F87171'
        }}>
          {feedback.text}
        </div>
      )}

      {/* Background info note */}
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Info size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#FFF' }}>Background Execution Guarantee:</strong> The node-cron scheduler runs directly inside your local Node.js server. Automation tasks continue firing at the exact scheduled time even when you close the browser or dashboard.
        </div>
      </div>

      {/* Schedules Table */}
      <Card title={`Active Automation Tasks (${schedules.length})`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Loading schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Clock size={36} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 600, color: '#FFF' }}>No Automation Schedules Configured</div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
              Create a schedule to automate daily educational post generation and delivery.
            </p>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-sm">
              Create Schedule
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Target Group</th>
                  <th>Topic</th>
                  <th>Content Type</th>
                  <th>Time / Frequency</th>
                  <th>Cron Expression</th>
                  <th>Last Run</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        onClick={() => handleToggle(item.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title={item.enabled ? 'Click to pause' : 'Click to activate'}
                      >
                        {item.enabled ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-offline">Paused</span>
                        )}
                      </button>
                    </td>
                    <td style={{ fontWeight: 700, color: '#FFF' }}>{item.group_name}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.topic}
                    </td>
                    <td><span className="badge badge-info">{item.content_type}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <strong>{item.posting_time}</strong> ({item.frequency})
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.cron_expression}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.last_run_at ? new Date(item.last_run_at).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleRunNow(item.id)}
                          disabled={runningJobId === item.id || health.emergencyStop}
                          className="btn btn-primary btn-sm"
                          title="Trigger Immediate Execution"
                        >
                          <Play size={13} className={runningJobId === item.id ? 'animate-spin' : ''} />
                          <span>Run Now</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSchedule({ ...item });
                            setIsEditModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Edit Schedule"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn btn-danger-outline btn-sm"
                          title="Delete Schedule"
                        >
                          <Trash2 size={13} />
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Automated Schedule"
        maxWidth="640px"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Target WhatsApp Group</label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              className="form-select"
              required
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.group_name} ({g.category})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Topic / Focus Subject</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="form-input"
              placeholder="e.g. Pandas Dataframe Vectorization Tips"
              required
            />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Content Type</label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                className="form-select"
              >
                <option value="Daily Tip">Daily Tip</option>
                <option value="Educational Post">Educational Post</option>
                <option value="Quiz">Quiz</option>
                <option value="Interview Question">Interview Question</option>
                <option value="Daily Challenge">Daily Challenge</option>
                <option value="Career Tip">Career Tip</option>
                <option value="Industry Update">Industry Update</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Posting Time (HH:mm)</label>
              <input
                type="time"
                value={formData.postingTime}
                onChange={(e) => setFormData({ ...formData, postingTime: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="form-select"
              >
                <option value="Daily">Daily</option>
                <option value="Weekdays">Weekdays (Mon-Fri)</option>
                <option value="Weekends">Weekends (Sat-Sun)</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Custom Cron (Optional Override)</label>
              <input
                type="text"
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                className="form-input"
                placeholder="e.g. 0 9 * * *"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Register Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Automation Schedule"
        maxWidth="640px"
      >
        {selectedSchedule && (
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Target WhatsApp Group</label>
              <select
                value={selectedSchedule.group_id}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, group_id: e.target.value })}
                className="form-select"
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.group_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic</label>
              <input
                type="text"
                value={selectedSchedule.topic}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, topic: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Content Type</label>
                <select
                  value={selectedSchedule.content_type}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, content_type: e.target.value })}
                  className="form-select"
                >
                  <option value="Daily Tip">Daily Tip</option>
                  <option value="Educational Post">Educational Post</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Interview Question">Interview Question</option>
                  <option value="Daily Challenge">Daily Challenge</option>
                  <option value="Career Tip">Career Tip</option>
                  <option value="Industry Update">Industry Update</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Posting Time</label>
                <input
                  type="time"
                  value={selectedSchedule.posting_time}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, posting_time: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  value={selectedSchedule.frequency}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, frequency: e.target.value })}
                  className="form-select"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cron Expression</label>
                <input
                  type="text"
                  value={selectedSchedule.cron_expression}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, cron_expression: e.target.value })}
                  className="form-input"
                />
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
    </div>
  );
}
