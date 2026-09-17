import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, LogOut, User } from 'lucide-react';
import { useSystemStatus } from '../context/SystemStatusContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title }) {
  const { health, refreshHealth, toggleEmergencyStop } = useSystemStatus();
  const { user, logout } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleEmergencyToggle = async () => {
    try {
      setToggling(true);
      await toggleEmergencyStop();
    } catch (err) {
      alert(`Failed to toggle Emergency Stop: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshHealth();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFF' }}>{title || 'Dashboard'}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Emergency Stop Button */}
        <button
          onClick={handleEmergencyToggle}
          disabled={toggling}
          className={`btn btn-sm ${health.emergencyStop ? 'btn-danger' : 'btn-danger-outline'}`}
          title={health.emergencyStop ? 'Click to Resume Automation' : 'Click to Halt All Automation'}
        >
          {health.emergencyStop ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
          <span>{health.emergencyStop ? 'EMERGENCY STOPPED' : 'EMERGENCY STOP'}</span>
        </button>

        {/* Refresh Status */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          title="Refresh System Health"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <User size={16} />
            <span style={{ fontWeight: 600, color: '#FFF' }}>{user?.name || 'Admin'}</span>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.6rem' }}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
