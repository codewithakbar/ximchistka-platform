import { io, Socket } from 'socket.io-client';
import { resolveWsBaseUrl } from '@ximchistka/shared';

let socket: Socket | null = null;

export function getSocketUrl() {
  return resolveWsBaseUrl(
    process.env.NEXT_PUBLIC_WS_URL,
    process.env.NEXT_PUBLIC_API_URL,
  );
}

/**
 * Token localStorage dan har bir ulanish urinishida o'qiladi — yangilangan
 * access token avtomatik ishlatiladi (api.ts ga import qilmaymiz: aylanma bog'liqlik).
 */
function currentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: (cb) => cb({ token: currentToken() }),
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
