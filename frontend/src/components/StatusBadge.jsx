import React from 'react';

export default function StatusBadge({ status, label }) {
  const normStatus = (status || '').toUpperCase();
  let badgeClass = 'badge-offline';
  let dotClass = 'offline';

  if (normStatus === 'ONLINE' || normStatus === 'READY' || normStatus === 'CONNECTED' || normStatus === 'OK' || normStatus === 'RUNNING' || normStatus === 'SUCCESS' || normStatus === 'APPROVED' || normStatus === 'SENT') {
    badgeClass = 'badge-success';
    dotClass = 'online';
  } else if (normStatus === 'INITIALIZING' || normStatus === 'QR_READY' || normStatus === 'AUTHENTICATED' || normStatus === 'DRAFT' || normStatus === 'RETRYING' || normStatus === 'PENDING') {
    badgeClass = 'badge-warning';
    dotClass = 'warning';
  } else if (normStatus === 'OFFLINE' || normStatus === 'FAILURE' || normStatus === 'DISCONNECTED' || normStatus === 'FAILED' || normStatus === 'REJECTED' || normStatus === 'STOPPED' || normStatus === 'ERROR') {
    badgeClass = 'badge-danger';
    dotClass = 'offline';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span className={`status-dot ${dotClass}`}></span>
      {label || status}
    </span>
  );
}
