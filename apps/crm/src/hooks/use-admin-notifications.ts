'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addAdminNotification,
  AdminRevenueNotification,
  loadAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '@/lib/admin-notifications';
import { formatPrice } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useClientRole } from '@/hooks/use-client-auth';

export function useAdminNotifications() {
  const role = useClientRole();
  const enabled = role === 'super_admin';
  const [items, setItems] = useState<AdminRevenueNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const syncUnread = useCallback((list: AdminRevenueNotification[]) => {
    setUnread(list.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setUnread(0);
      return;
    }

    const stored = loadAdminNotifications();
    setItems(stored);
    syncUnread(stored);

    const socket = getSocket();
    if (!socket) return;

    const onRevenue = (notification: AdminRevenueNotification) => {
      const next = addAdminNotification(notification);
      setItems(next);
      syncUnread(next);

      toast(notification.title, {
        description: `${notification.message} · ${formatPrice(notification.amount)}`,
        duration: 6000,
      });
    };

    socket.on('admin:revenue', onRevenue);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off('admin:revenue', onRevenue);
    };
  }, [enabled, syncUnread]);

  const markRead = useCallback(
    (id: string) => {
      const next = markAdminNotificationRead(id);
      setItems(next);
      syncUnread(next);
    },
    [syncUnread],
  );

  const markAllRead = useCallback(() => {
    const next = markAllAdminNotificationsRead();
    setItems(next);
    syncUnread(next);
  }, [syncUnread]);

  return { items, unread, enabled, markRead, markAllRead };
}
