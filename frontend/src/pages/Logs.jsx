import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Trash2,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { Card } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import api from '../services/api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '50');
      if (statusFilter) params.append('status', statusFilter);
      if (logTypeFilter) params.append('logType', logTypeFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter, logTypeFilter, search]);

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all logs older than 30 days?')) return;
    try {
      const res = await api.post('/logs/clear', { days: 30 });
      if (res.data.success) {
        setFeedback({ type: 'success', text: res.data.message });
        await fetchLogs();
      }
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>System & Message Audit Logs</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Comprehensive tracking for automated AI generation, scheduled dispatches, retries, and errors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={handleClearLogs} className="btn btn-danger-outline btn-sm">
            <Trash2 size={15} />
            <span>Clear Old Logs</span>
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

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search group name, message snippet, or error message..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
            <option value="skipped">Skipped / Pending</option>
          </select>

          <select
            value={logTypeFilter}
            onChange={(e) => { setLogTypeFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Types</option>
            <option value="scheduled">Scheduled Automation</option>
            <option value="manual_test">Manual Test</option>
            <option value="immediate">Immediate Dispatch</option>
          </select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card title={`Recorded Activity (${pagination.total} entries)`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Loading activity logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 600, color: '#FFF' }}>No Log Records Found</div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
              Scheduled automated messages and test sends will record detailed logs here.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Target Group</th>
                  <th>Type</th>
                  <th>Message Snippet / Error</th>
                  <th>Retries</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{log.id}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: '#FFF' }}>{log.group_name || 'System / Draft'}</td>
                    <td><span className="badge badge-info">{log.log_type}</span></td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {log.error_message ? (
                        <span style={{ color: '#F87171' }}>Error: {log.error_message}</span>
                      ) : (
                        log.content_snippet || 'N/A'
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                      {log.retry_count > 0 ? (
                        <span style={{ color: '#FBBF24', fontWeight: 600 }}>{log.retry_count}</span>
                      ) : '0'}
                    </td>
                    <td><StatusBadge status={log.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="View Detailed Log"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Log Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Audit Log #${selectedLog?.id} Details`}
        maxWidth="640px"
      >
        {selectedLog && (
          <div style={{ fontSize: '0.88rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div><strong>Group:</strong> {selectedLog.group_name || 'N/A'}</div>
              <div><strong>Status:</strong> <StatusBadge status={selectedLog.status} /></div>
              <div><strong>Type:</strong> {selectedLog.log_type}</div>
              <div><strong>Retry Count:</strong> {selectedLog.retry_count}</div>
              <div><strong>Scheduled At:</strong> {selectedLog.scheduled_at || 'N/A'}</div>
              <div><strong>Sent At:</strong> {selectedLog.sent_at || 'N/A'}</div>
            </div>

            {selectedLog.error_message && (
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', backgroundColor: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#F87171' }}>
                <strong>Error Message:</strong>
                <pre style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {selectedLog.error_message}
                </pre>
              </div>
            )}

            <div>
              <label className="form-label">Message Payload Content</label>
              <div style={{ backgroundColor: '#0B0F19', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {selectedLog.content_snippet || 'No message body snippet attached.'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
