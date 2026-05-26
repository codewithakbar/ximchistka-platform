export type AdminRevenueNotification = {
  id: string;
  type: 'order_created' | 'order_received' | 'order_completed' | 'payment_received';
  title: string;
  message: string;
  amount: number;
  branchId: string;
  branchName: string;
  orderId: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  read?: boolean;
};

const STORAGE_KEY = 'ximchistka-admin-revenue-notifications';
const MAX_ITEMS = 50;

export function loadAdminNotifications(): AdminRevenueNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminRevenueNotification[]) : [];
  } catch {
    return [];
  }
}

export function saveAdminNotifications(items: AdminRevenueNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function addAdminNotification(item: AdminRevenueNotification) {
  const list = loadAdminNotifications();
  const next = [{ ...item, read: false }, ...list.filter((n) => n.id !== item.id)].slice(0, MAX_ITEMS);
  saveAdminNotifications(next);
  return next;
}

export function markAdminNotificationRead(id: string) {
  const list = loadAdminNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveAdminNotifications(list);
  return list;
}

export function markAllAdminNotificationsRead() {
  const list = loadAdminNotifications().map((n) => ({ ...n, read: true }));
  saveAdminNotifications(list);
  return list;
}

export function clearAdminNotifications() {
  localStorage.removeItem(STORAGE_KEY);
}
