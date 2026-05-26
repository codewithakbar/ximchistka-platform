'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

type OrderEvent = {
  branchId: string;
  order: { status?: string; totalAmount?: number; orderNumber?: string };
};

/**
 * Subscribes to order WebSocket events and debounces refresh (reports, dashboard).
 */
export function useRealtimeOrders(onUpdate: () => void, enabled = true) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    if (!socket) return;

    let timer: ReturnType<typeof setTimeout>;
    const refresh = (_payload?: OrderEvent) => {
      clearTimeout(timer);
      timer = setTimeout(() => onUpdateRef.current(), 400);
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:updated', refresh);

    if (socket.connected) setConnected(true);
    else socket.connect();

    return () => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:updated', refresh);
    };
  }, [enabled]);

  return { connected };
}
