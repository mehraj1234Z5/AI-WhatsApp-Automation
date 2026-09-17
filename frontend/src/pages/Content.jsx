import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  RotateCw,
  Edit3,
  Search,
  Filter,
  AlertCircle,
  Eye,
  Check,
  X,
  Cpu,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import WhatsAppPreview from '../components/WhatsAppPreview';
import api from '../services/api';
import { useSystemStatus } from '../context/SystemStatusContext';

export default function Content() {
  const { health } = useSystemStatus();
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Generator form state
  const [formData, setFormData] = useState({
    groupId: '',
    category: 'Data Analytics',
    topic: 'SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK)',
    contentType: 'Daily Tip',
    audience: 'Data Analytics Students',
    language: 'English',
    tone: 'Professional & Engaging',
    customInstructions: '',
    model: ''
  });

  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // History filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTopic, setSearchTopic] = useState('');

  const fetchData = async () => {
    try {
      const [catsRes, groupsRes, modelsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/whatsapp/groups'),
        api.get('/ollama/models').catch(() => ({ data: { success: false, models: [] } }))
      ]);
      if (catsRes.data.success) setCategories(catsRes.data.data);
      if (groupsRes.data.groups) setGroups(groupsRes.data.groups);
      if (modelsRes.data.success && modelsRes.data.models) {
        setAvailableModels(modelsRes.data.models);
        if (modelsRes.data.models.length > 0 && !formData.model) {
          // Default to llama3 or first model
          const defaultM = modelsRes.data.models.find(m => m.name.includes('llama3')) || modelsRes.data.models[0];
          setFormData(prev => ({ ...prev, model: defaultM.name }));
        }
      }
    } catch (err) {
      console.error('Failed to load initial content data:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const queryParams = new URLSearchParams();
      if (filterCategory) queryParams.append('category', filterCategory);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (searchTopic) queryParams.append('topic', searchTopic);

      const res = await api.get(`/content?${queryParams.toString()}`);
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch content history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [filterCategory, filterStatus, searchTopic]);

  const handleCategoryChange = (e) => {
    const selectedCat = e.target.value;
    const catObj = categories.find(c => c.name === selectedCat);
    const defaultTopic = catObj && catObj.topics && catObj.topics.length > 0 ? catObj.topics[0].name : '';
    setFormData({
      ...formData,
      category: selectedCat,
      topic: defaultTopic
    });
  };

  const handleGenerate = async () => {
    if (!formData.topic || formData.topic.trim().length === 0) {
      alert('Please enter or select a topic.');
      return;
    }

    try {
      setGenerating(true);
      setActionFeedback(null);
      const res = await api.post('/content/generate', formData);
      if (res.data.success) {
        setGeneratedResult(res.data.data);
        setEditableContent(res.data.data.content);
        setActionFeedback({ type: 'success', text: `Generated post successfully with ${res.data.data.model}!` });
        await fetchHistory();
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setActionFeedback({ type: 'danger', text: `Generation failed: ${errMsg}` });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!generatedResult || !generatedResult.id) return;
    try {
      const res = await api.put(`/content/${generatedResult.id}`, {
        content: editableContent
      });
      if (res.data.success) {
        setGeneratedResult({ ...generatedResult, content: editableContent });
        setActionFeedback({ type: 'success', text: 'Changes saved to draft.' });
        await fetchHistory();
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await api.post(`/content/${id}/approve`);
      if (res.data.success) {
        setActionFeedback({ type: 'success', text: 'Content approved.' });
        await fetchHistory();
        if (generatedResult?.id === id) {
          setGeneratedResult({ ...generatedResult, status: 'approved', approved: true });
        }
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await api.post(`/content/${id}/reject`);
      if (res.data.success) {
        setActionFeedback({ type: 'warning', text: 'Content rejected.' });
        await fetchHistory();
        if (generatedResult?.id === id) {
          setGeneratedResult({ ...generatedResult, status: 'rejected', approved: false });
        }
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', text: err.message });
    }
  };

  const handleSendNow = async (id, targetGroupId) => {
    try {
      setActionFeedback(null);
      const res = await api.post(`/content/${id}/send`, { targetGroupId });
      if (res.data.success) {
        setActionFeedback({ type: 'success', text: res.data.message });
        await fetchHistory();
        if (generatedResult?.id === id) {
          setGeneratedResult({ ...generatedResult, status: 'sent' });
        }
      }
    } catch (err) {
      setActionFeedback({ type: 'danger', text: err.message });
    }
  };

  const loadIntoLiveStudio = (item) => {
    setGeneratedResult(item);
    setEditableContent(item.content);
    setFormData(prev => ({
      ...prev,
      category: item.category || prev.category,
      topic: item.topic || prev.topic,
      contentType: item.content_type || prev.contentType,
      audience: item.audience || prev.audience,
      tone: item.tone || prev.tone,
      groupId: item.group_id || prev.groupId
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentCategoryObj = categories.find(c => c.name === formData.category);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF' }}>AI Content Studio & History</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Generate, validate, preview, and review high-quality WhatsApp posts using local Ollama.
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : actionFeedback.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : actionFeedback.type === 'warning' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: actionFeedback.type === 'success' ? '#34D399' : actionFeedback.type === 'warning' ? '#FBBF24' : '#F87171',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionFeedback.text}</span>
          <button onClick={() => setActionFeedback(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Content Generator Workshop */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Controls Panel */}
        <Card title="AI Content Generation Parameters">
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                className="form-select"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

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
                <option value="Question of the Day">Question of the Day</option>
                <option value="Course Promotion">Course Promotion</option>
                <option value="Announcement">Announcement</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Topic</label>
            {currentCategoryObj && currentCategoryObj.topics && currentCategoryObj.topics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="form-select"
                >
                  {currentCategoryObj.topics.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Or enter custom topic..."
                  className="form-input"
                />
              </div>
            ) : (
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="form-input"
                required
              />
            )}
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
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

            <div className="form-group">
              <label className="form-label">Tone</label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                className="form-select"
              >
                <option value="Professional & Engaging">Professional & Engaging</option>
                <option value="Casual & Friendly">Casual & Friendly</option>
                <option value="Technical & In-Depth">Technical & In-Depth</option>
                <option value="Inspirational & Motivating">Inspirational & Motivating</option>
              </select>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">AI Model (Ollama)</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="form-select"
              >
                {availableModels.length > 0 ? (
                  availableModels.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))
                ) : (
                  <>
                    <option value="llama3:latest">llama3:latest (Default)</option>
                    <option value="deepseek-r1:14b">deepseek-r1:14b</option>
                    <option value="tinyllama:latest">tinyllama:latest (Fastest)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign to WhatsApp Group</label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="form-select"
              >
                <option value="">-- General Draft (No Group) --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.group_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Prompt Directives (Optional)</label>
            <input
              type="text"
              value={formData.customInstructions}
              onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
              className="form-input"
              placeholder="e.g. Explain in simple words with 3 practical examples..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || health.ollama === 'OFFLINE'}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
          >
            <Sparkles size={18} className={generating ? 'animate-spin' : ''} />
            <span>{generating ? 'Generating via Ollama...' : 'Generate AI WhatsApp Post'}</span>
          </button>
        </Card>

        {/* Live Preview & Editor */}
        <Card title="Live Preview & Validation Studio">
          {generating ? (
            /* Live Generating AI Loader State */
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
              border: '1px dashed rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 1.25rem' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '3px solid rgba(16, 185, 129, 0.2)',
                  borderTopColor: '#10B981',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  inset: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981'
                }}>
                  <Sparkles size={24} />
                </div>
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', marginBottom: '0.4rem' }}>
                Generating WhatsApp Post...
              </h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                Prompting <strong>{formData.model || 'local Ollama'}</strong> with category guidelines, formatting rules, and emoji enhancements.
              </p>

              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left', fontSize: '0.8rem', color: '#9CA3AF', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div>✨ Topic: <span style={{ color: '#FFF' }}>{formData.topic}</span></div>
                <div>🎯 Persona: <span style={{ color: '#FFF' }}>{formData.audience}</span></div>
                <div>⏱️ Status: <span style={{ color: '#10B981' }}>Processing tokens via local LLM...</span></div>
              </div>
            </div>
          ) : generatedResult ? (
            <div>
              {/* Validation Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-info">Model: {generatedResult.model}</span>
                <span className="badge badge-info">{editableContent.length} chars</span>
                <StatusBadge status={generatedResult.status} />
              </div>

              {generatedResult.validation?.warnings?.length > 0 && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--status-warning-bg)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#FBBF24' }}>
                  <strong>Notice:</strong> {generatedResult.validation.warnings.join(' ')}
                </div>
              )}

              {/* Editable Area */}
              <div className="form-group">
                <label className="form-label">Edit Message Text</label>
                <textarea
                  rows={6}
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* Simulated Bubble */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">WhatsApp Render Preview</label>
                <WhatsAppPreview text={editableContent} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button onClick={handleSaveEdits} className="btn btn-secondary btn-sm">
                  <Edit3 size={14} />
                  <span>Save Draft</span>
                </button>
                <button onClick={handleGenerate} disabled={generating} className="btn btn-secondary btn-sm">
                  <RotateCw size={14} />
                  <span>Regenerate</span>
                </button>
                <button onClick={() => handleApprove(generatedResult.id)} className="btn btn-secondary btn-sm" style={{ color: '#34D399' }}>
                  <Check size={14} />
                  <span>Approve</span>
                </button>
                <button onClick={() => handleReject(generatedResult.id)} className="btn btn-secondary btn-sm" style={{ color: '#F87171' }}>
                  <X size={14} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleSendNow(generatedResult.id, formData.groupId || generatedResult.groupId)}
                  disabled={!health.whatsappConnected}
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: 'auto' }}
                >
                  <Send size={14} />
                  <span>Send to WhatsApp Now</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <Sparkles size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600, color: '#FFF' }}>No Content Generated Yet</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Select parameters on the left and click <strong>Generate AI WhatsApp Post</strong>.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Content History Table */}
      <Card title="Generated Content Repository & History">
        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search topic in history..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Loading content history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No content entries match your filter.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Topic</th>
                  <th>Category</th>
                  <th>Target Group</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{item.id}</td>
                    <td style={{ fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.topic}
                    </td>
                    <td><span className="badge badge-info">{item.category}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{item.group_name || 'General Draft'}</td>
                    <td className="font-mono" style={{ fontSize: '0.75rem' }}>{item.model}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(item.generated_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => loadIntoLiveStudio(item)}
                          className="btn btn-secondary btn-sm"
                          title="Load into live editor and preview"
                        >
                          <Edit3 size={14} />
                          <span>Load</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedHistoryItem(item);
                            setIsPreviewModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Inspect details"
                        >
                          <Eye size={14} />
                          <span>Inspect</span>
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

      {/* History Inspect Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Inspect Content #${selectedHistoryItem?.id}: ${selectedHistoryItem?.topic}`}
        maxWidth="680px"
      >
        {selectedHistoryItem && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">{selectedHistoryItem.category}</span>
              <span className="badge badge-info">{selectedHistoryItem.content_type}</span>
              <span className="badge badge-info">{selectedHistoryItem.audience}</span>
              <StatusBadge status={selectedHistoryItem.status} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <WhatsAppPreview text={selectedHistoryItem.content} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                onClick={() => {
                  loadIntoLiveStudio(selectedHistoryItem);
                  setIsPreviewModalOpen(false);
                }}
                className="btn btn-secondary btn-sm"
              >
                <Edit3 size={14} />
                <span>Load into Editor</span>
              </button>
              {selectedHistoryItem.status !== 'approved' && selectedHistoryItem.status !== 'sent' && (
                <button
                  onClick={() => {
                    handleApprove(selectedHistoryItem.id);
                    setIsPreviewModalOpen(false);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#34D399' }}
                >
                  <Check size={14} />
                  <span>Approve</span>
                </button>
              )}
              {selectedHistoryItem.group_id && (
                <button
                  onClick={() => {
                    handleSendNow(selectedHistoryItem.id, selectedHistoryItem.group_id);
                    setIsPreviewModalOpen(false);
                  }}
                  disabled={!health.whatsappConnected}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} />
                  <span>Send to Group</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
