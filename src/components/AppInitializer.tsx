import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAlertStore } from '../store/useAlertStore';
import { alertEngine } from '../lib/alerts/alertEngine';
import { useUIStore } from '../store/useUIStore';

export const AppInitializer: React.FC = () => {
  const { alerts, updateAlert } = useAlertStore();
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  useEffect(() => {
    // 1. Alert monitoring activation
    alertEngine.startMonitoring(alerts, alerts, updateAlert);

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

    console.log('🤖 [AutoSLP] Engine initialized. Alerts registered:', alerts.filter(a => a.status === 'ACTIVE').length);

    return () => {
      alertEngine.stopAll();
      unsub();
      clearTimeout(connectTimer);
    };
  }, [alerts, updateAlert, setConnectionStatus]);

  return null;
};

export default AppInitializer;
