import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Sparkles,
  Users,
  Truck,
  BarChart3,
  UserCog,
} from 'lucide-react';

export type StaffRole =
  | 'super_admin'
  | 'branch_manager'
  | 'operator'
  | 'courier';

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super admin',
  branch_manager: 'Filial menejeri',
  operator: 'Operator',
  courier: 'Kuryer',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  super_admin: 'Barcha filiallar va tizim sozlamalari',
  branch_manager: 'O\'z filialidagi buyurtmalar va boshqaruv',
  operator: 'Buyurtmalarni qabul qilish va status boshqaruvi',
  courier: 'Yetkazish vazifalari va buyurtma topshirish',
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: StaffRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Boshqaruv', icon: LayoutDashboard, roles: ['super_admin', 'branch_manager', 'operator', 'courier'] },
  { href: '/orders', label: 'Buyurtmalar', icon: ClipboardList, roles: ['super_admin', 'branch_manager', 'operator'] },
  { href: '/branches', label: 'Filiallar', icon: Building2, roles: ['super_admin', 'branch_manager'] },
  { href: '/services', label: 'Xizmatlar', icon: Sparkles, roles: ['super_admin', 'branch_manager'] },
  { href: '/customers', label: 'Mijozlar', icon: Users, roles: ['super_admin', 'branch_manager', 'operator'] },
  { href: '/courier', label: 'Kuryer', icon: Truck, roles: ['super_admin', 'branch_manager', 'operator', 'courier'] },
  { href: '/reports', label: 'Hisobotlar', icon: BarChart3, roles: ['super_admin'] },
  { href: '/staff', label: 'Xodimlar', icon: UserCog, roles: ['super_admin', 'branch_manager'] },
];

export function getNavForRole(role: string) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role as StaffRole));
}

export function canAccessRoute(role: string, path: string): boolean {
  if (path.startsWith('/settings')) return true;
  if (path.startsWith('/branches/') && path !== '/branches') {
    return NAV_ITEMS.some((n) => n.href === '/branches' && n.roles.includes(role as StaffRole));
  }
  const item = NAV_ITEMS.find((n) => path.startsWith(n.href));
  if (!item) return path === '/' || path.startsWith('/login');
  return item.roles.includes(role as StaffRole);
}

export const CREATABLE_ROLES: StaffRole[] = ['branch_manager', 'operator', 'courier'];

export const STAFF_CREATOR_ROLES: StaffRole[] = ['super_admin'];

export const ORDER_CREATOR_ROLES: StaffRole[] = ['super_admin', 'branch_manager', 'operator'];

export function canCreateOrders(role: string) {
  return ORDER_CREATOR_ROLES.includes(role as StaffRole);
}

export function canAddStaff(role: string) {
  return STAFF_CREATOR_ROLES.includes(role as StaffRole);
}

export function canManageBranches(role: string) {
  return role === 'super_admin';
}
