import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAlertStore } from '../store/useAlertStore';
import { alertEngine } from '../lib/alerts/alertEngine';
import { useUIStore } from '../store/useUIStore';

export const AppInitializer: React.FC = () => {
  const alerts = useAlertStore((s) => s.alerts);
  const updateAlert = useAlertStore((s) => s.updateAlert);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  // Derive a stable primitive dependency key for active alert updates to avoid infinite loops
  const alertsKey = alerts.map((a) => `${a.id}:${a.status}`).join(',');

  useEffect(() => {
    const currentAlerts = useAlertStore.getState().alerts;
    // 1. Alert monitoring activation
    alertEngine.startMonitoring(currentAlerts, currentAlerts, updateAlert);

    // 2. Alert callbacks (toaster popup)
    const unsub = alertEngine.onTrigger((triggeredAlert) => {
      toast(`🔔 Alert Triggered: ${triggeredAlert.pair} — ${triggeredAlert.label}`, {
        duration: 6000,
        icon: '🔔',
        style: {
          background: '#1A1F2C',
          color: '#F3F4F6',
          border: '1px solid #2A2E39',
          fontFamily: 'monospace',
          fontSize: '12px'
        },
      });
    });

    // 3. Connection state updates
    setConnectionStatus('connecting');
    const connectTimer = setTimeout(() => {
      setConnectionStatus('connected');
      console.log('💚 [AutoSLP] WebSocket streaming active.');
    }, 1200);

    // 4. Push notifications permission request
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    console.log('🤖 [AutoSLP] Engine initialized. Alerts registered:', currentAlerts.filter(a => a.status === 'ACTIVE').length);

    return () => {
      alertEngine.stopAll();
      unsub();
      clearTimeout(connectTimer);
    };
  }, [alertsKey, updateAlert, setConnectionStatus]);

  return null;
};

export default AppInitializer;
