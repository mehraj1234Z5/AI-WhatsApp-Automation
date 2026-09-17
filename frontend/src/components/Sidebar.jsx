import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Sparkles,
  Calendar,
  Cpu,
  FileText,
  Settings,
  Bot
} from 'lucide-react';
import { useSystemStatus } from '../context/SystemStatusContext';
import StatusBadge from './StatusBadge';

export default function Sidebar() {
  const { health } = useSystemStatus();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { to: '/groups', label: 'Groups', icon: Users },
    { to: '/content', label: 'Content Studio', icon: Sparkles },
    { to: '/schedules', label: 'Schedules', icon: Calendar },
    { to: '/ai-settings', label: 'AI Settings', icon: Cpu },
    { to: '/logs', label: 'Logs', icon: FileText },
    { to: '/settings', label: 'System Settings', icon: Settings }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Bot size={22} />
        </div>
        <div>
          <div className="brand-title">AI WhatsApp</div>
          <div className="brand-subtitle">Automation Agent</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="text-secondary">WA Status:</span>
          <StatusBadge status={health.whatsapp} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-secondary">Ollama:</span>
          <StatusBadge status={health.ollama} />
        </div>
      </div>
    </aside>
  );
}
