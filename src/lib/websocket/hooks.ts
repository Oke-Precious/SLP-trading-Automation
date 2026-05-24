/**
 * @file hooks.ts
 * @description React hook to subscribe/unsubscribe to WebSocket stream channels.
 */

import { useEffect } from 'react';
import { getWebSocketClient, onCandleUpdate } from './client';
import { useUIStore } from '../../store/useUIStore';
import { useQueryClient } from '@tanstack/react-query';

export const useWebSocket = (event?: string, callback?: (data: any) => void) => {
  const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);

  useEffect(() => {
    const socket = getWebSocketClient();

    const handleConnect = () => {
      setConnectionStatus('connected');
      // Join general user room
      const token = localStorage.getItem('autoslp_token');
      if (token) {
        socket.emit('join_user_room', { token });
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnectError = () => {
      setConnectionStatus('connecting');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleConnectError);

    // Initial connection activation
    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    } else {
      setConnectionStatus('connected');
    }

    if (event && callback) {
      socket.on(event, callback);
    }

    // Dynamic token re-authentication event listener
    const handleTokenRefreshed = (e: any) => {
      const newToken = e.detail;
      socket.auth = { token: newToken };
      if (socket.connected) {
        socket.emit('reauthenticate', { token: newToken });
      } else {
        socket.connect();
      }
    };

    window.addEventListener('autoslp_token_refreshed', handleTokenRefreshed as any);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleConnectError);
      if (event && callback) {
        socket.off(event, callback);
      }
      window.removeEventListener('autoslp_token_refreshed', handleTokenRefreshed as any);
    };
  }, [event, callback, setConnectionStatus]);
};

export const useRealtimeCandles = (pair: string, timeframe: string) => {
  const queryClient = useQueryClient();
  useWebSocket(); // Ensure connection is established

  useEffect(() => {
    const unsubscribe = onCandleUpdate(pair, timeframe, (candle: any) => {
      if (!candle) return;

      queryClient.setQueryData(['market-candles', pair, timeframe], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        const updated = [...old];
        const lastIndex = updated.length - 1;

        if (updated[lastIndex] && updated[lastIndex].time === candle.time) {
          updated[lastIndex] = { ...updated[lastIndex], ...candle };
        } else {
          const existingIndex = updated.findIndex((c) => c.time === candle.time);
          if (existingIndex !== -1) {
            updated[existingIndex] = { ...updated[existingIndex], ...candle };
          } else {
            updated.push(candle);
            if (updated.length > 200) {
              updated.shift();
            }
          }
        }
        return updated;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [pair, timeframe, queryClient]);
};

