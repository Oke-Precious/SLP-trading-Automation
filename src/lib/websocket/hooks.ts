/**
 * @file hooks.ts
 * @description React hook to subscribe/unsubscribe to WebSocket stream channels.
 */

import { useEffect } from 'react';
import { getWebSocketClient } from './client';

export const useWebSocket = (event: string, callback: (data: any) => void) => {
  useEffect(() => {
    const socket = getWebSocketClient();
    
    if (!socket.connected) {
      socket.connect();
    }

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
};
