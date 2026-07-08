import { io, Socket } from 'socket.io-client';
import { resolveWsBaseUrl } from '@ximchistka/shared';

let socket: Socket | null = null;

export function getSocketUrl() {
  return resolveWsBaseUrl(
    process.env.NEXT_PUBLIC_WS_URL,
    process.env.NEXT_PUBLIC_API_URL,
  );
}

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
