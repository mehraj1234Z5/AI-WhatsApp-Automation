import React from 'react';

export function Card({ title, subtitle, extra, children, className = '', style = {} }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || extra) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'var(--accent-primary)', subtext }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{subtext}</div>}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper" style={{ color }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}

export default Card;
