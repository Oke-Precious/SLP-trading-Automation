import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../constants';

let socket: Socket | null = null;

const getAccessToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('autoslp_token') || '';
  }
  return '';
};

export const getWebSocketClient = (): Socket => {
  if (!socket) {
    socket = io(WS_URL, {
      auth: { token: getAccessToken() },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      autoConnect: false,
    });
  }
  return socket;
};

export const reconnectSocketWithToken = (token: string) => {
  const s = getWebSocketClient();
  s.auth = { token };
  if (s.connected) {
    s.disconnect().connect();
  } else {
    s.connect();
  }
};

export const onCandleUpdate = (
  pair: string,
  timeframe: string,
  callback: (candle: any) => void
) => {
  const s = getWebSocketClient();
  
  if (!s.connected) {
    s.connect();
  }

  // Tell backend we want updates
  s.emit('subscribe', { event: 'candles', pair, timeframe });

  const customEventName = `candle_update:${pair}:${timeframe}`;
  
  const handleEvent = (data: any) => {
    callback(data);
  };

  const handleGenericEvent = (data: any) => {
    if (data && data.pair === pair && data.timeframe === timeframe) {
      callback(data);
    }
  };

  s.on(customEventName, handleEvent);
  s.on('candle_update', handleGenericEvent);

  return () => {
    s.off(customEventName, handleEvent);
    s.off('candle_update', handleGenericEvent);
    s.emit('unsubscribe', { event: 'candles', pair, timeframe });
  };
};

export const onBiasUpdate = (pair: string, callback: (bias: any) => void) => {
  const s = getWebSocketClient();
  
  if (!s.connected) {
    s.connect();
  }

  s.emit('subscribe', { event: 'bias', pair });

  const customEventName = `bias_update:${pair}`;

  const handleEvent = (data: any) => {
    callback(data);
  };

  const handleGenericEvent = (data: any) => {
    if (data && data.pair === pair) {
      callback(data);
    }
  };

  s.on(customEventName, handleEvent);
  s.on('bias_update', handleGenericEvent);

  return () => {
    s.off(customEventName, handleEvent);
    s.off('bias_update', handleGenericEvent);
    s.emit('unsubscribe', { event: 'bias', pair });
  };
};

export const onSignalCreated = (callback: (signal: any) => void) => {
  const s = getWebSocketClient();
  
  if (!s.connected) {
    s.connect();
  }

  s.on('signal_created', callback);

  return () => {
    s.off('signal_created', callback);
  };
};

export const onAlertTriggered = (callback: (alert: any) => void) => {
  const s = getWebSocketClient();
  
  if (!s.connected) {
    s.connect();
  }

  s.on('alert_triggered', callback);

  return () => {
    s.off('alert_triggered', callback);
  };
};

export const onPOIStatusChange = (callback: (poi: any) => void) => {
  const s = getWebSocketClient();
  
  if (!s.connected) {
    s.connect();
  }

  s.on('poi_status_change', callback);

  return () => {
    s.off('poi_status_change', callback);
  };
};

