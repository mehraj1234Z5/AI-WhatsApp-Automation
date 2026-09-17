import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SystemStatusContext = createContext(null);

export function SystemStatusProvider({ children }) {
  const [health, setHealth] = useState({
    backend: 'UNKNOWN',
    database: 'UNKNOWN',
    ollama: 'UNKNOWN',
    aiModel: 'UNKNOWN',
    whatsapp: 'DISCONNECTED',
    whatsappConnected: false,
    scheduler: 'UNKNOWN',
    emergencyStop: false
  });
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get('/health');
      if (res.data && res.data.data) {
        setHealth(res.data.data);
      }
    } catch {
      setHealth((prev) => ({
        ...prev,
        backend: 'OFFLINE',
        database: 'OFFLINE',
        ollama: 'OFFLINE',
        scheduler: 'OFFLINE'
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const toggleEmergencyStop = async () => {
    try {
      const res = await api.post('/settings/emergency-stop');
      if (res.data && res.data.success) {
        setHealth((prev) => ({ ...prev, emergencyStop: res.data.emergencyStop }));
        return res.data;
      }
    } catch (err) {
      console.error('Failed to toggle emergency stop:', err);
      throw err;
    }
  };

  return (
    <SystemStatusContext.Provider value={{ health, loading, refreshHealth: fetchHealth, toggleEmergencyStop }}>
      {children}
    </SystemStatusContext.Provider>
  );
}

export function useSystemStatus() {
  const context = useContext(SystemStatusContext);
  if (!context) {
    throw new Error('useSystemStatus must be used within a SystemStatusProvider');
  }
  return context;
}
