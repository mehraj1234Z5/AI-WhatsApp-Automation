import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Bot,
  AlertTriangle,
  Play,
  ArrowRight
} from 'lucide-react';
import { useSystemStatus } from '../context/SystemStatusContext';
import { Card, StatCard } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function Dashboard() {
  const { health, refreshHealth } = useSystemStatus();
  const [stats, setStats] = useState({
    todayMessages: 0,
    todaySuccess: 0,
    todayFailed: 0,
    totalGroups: 0,
    enabledGroups: 0,
    totalContent: 0,
    pendingDrafts: 0,
    activeSchedules: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.get('/logs/stats'),
          api.get('/logs?limit=5')
        ]);
        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
        }
        if (logsRes.data.success) {
          setRecentLogs(logsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Emergency Stop Alert */}
      {health.emergencyStop && (
        <div className="emergency-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} />
            <div>
              <div style={{ fontSize: '1rem' }}>EMERGENCY STOP IS ACTIVE</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 500 }}>
                All scheduled generations and WhatsApp message dispatches are currently paused.
              </div>
            </div>
          </div>
          <Link to="/settings" className="btn btn-secondary btn-sm" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            System Settings
          </Link>
        </div>
      )}

      {/* System Status Overview Cards */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#FFF' }}>System Engine Health</h2>
        <div className="grid-cols-4">
          <Card className="flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>WhatsApp Web</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#FFF' }}>
                {health.whatsappConnected ? 'Connected & Ready' : health.whatsapp}
              </div>
            </div>
            <StatusBadge status={health.whatsapp} />
          </Card>

          <Card className="flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Ollama Local AI</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#FFF' }}>{health.ollama}</div>
            </div>
            <StatusBadge status={health.ollama} />
          </Card>

          <Card className="flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Active Model</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#FFF', fontSize: '0.9rem' }}>
                {health.aiModel || 'Detecting...'}
              </div>
            </div>
            <StatusBadge status={health.aiModel?.startsWith('OK') ? 'OK' : 'OFFLINE'} />
          </Card>

          <Card className="flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
            <div>
              <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Scheduler Engine</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#FFF' }}>
                {health.scheduler} ({health.activeJobs || 0} jobs)
              </div>
            </div>
            <StatusBadge status={health.scheduler} />
          </Card>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#FFF' }}>Today's Activity Metrics</h2>
        <div className="grid-cols-4">
          <StatCard
            label="Today's Messages"
            value={stats.todayMessages}
            icon={MessageSquare}
            color="#3B82F6"
            subtext="Total automation dispatches"
          />
          <StatCard
            label="Successfully Sent"
            value={stats.todaySuccess}
            icon={CheckCircle}
            color="#10B981"
            subtext="Delivered to WhatsApp groups"
          />
          <StatCard
            label="Failed / Retried"
            value={stats.todayFailed}
            icon={XCircle}
            color="#EF4444"
            subtext="Delivery errors logged"
          />
          <StatCard
            label="Active Groups"
            value={`${stats.enabledGroups} / ${stats.totalGroups}`}
            icon={Users}
            color="#8B5CF6"
            subtext="Groups with automation enabled"
          />
        </div>
      </div>

      {/* Quick Action Bar + Recent Activity */}
      <div className="grid-cols-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Quick Action Panel */}
        <Card title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/content" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
              <Sparkles size={18} />
              <span>Generate AI Content Now</span>
            </Link>

            <Link to="/whatsapp" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <MessageSquare size={18} />
              <span>WhatsApp Connection & QR</span>
            </Link>

            <Link to="/groups" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <Users size={18} />
              <span>Configure Target Groups</span>
            </Link>

            <Link to="/schedules" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <Clock size={18} />
              <span>Manage Automation Schedules</span>
            </Link>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF', marginBottom: '0.35rem' }}>
              Pending Content Review
            </div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              You have <strong style={{ color: '#10B981' }}>{stats.pendingDrafts}</strong> generated draft(s) awaiting approval before sending.
            </div>
            <Link to="/content" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Review drafts <ArrowRight size={14} />
            </Link>
          </div>
        </Card>

        {/* Recent Message Logs */}
        <Card
          title="Recent Activity Feed"
          extra={
            <Link to="/logs" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              View All Logs →
            </Link>
          }
        >
          {recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No messages recorded yet. Generated scheduled messages will appear here.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Target Group</th>
                    <th>Snippet</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.group_name || 'System'}</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {log.content_snippet || log.error_message || 'N/A'}
                      </td>
                      <td>
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
