/**
 * @file client.ts
 * @description WebSocket client using socket.io-client or native WebSockets.
 */

import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../constants';

let socket: Socket | null = null;

export const getWebSocketClient = (): Socket => {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      transports: ['websocket'],
    });
  }
  return socket;
};
