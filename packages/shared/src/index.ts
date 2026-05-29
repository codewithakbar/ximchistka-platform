export const ORDER_STATUSES = [
  'draft',
  'submitted',
  'received_at_branch',
  'in_processing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAFF_ROLES = [
  'platform_admin',
  'super_admin',
  'branch_manager',
  'operator',
  'courier',
] as const;

export const ORGANIZATION_PLANS = ['demo', 'active', 'expired', 'suspended'] as const;
export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number];

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Qoralama',
  submitted: 'Yuborilgan',
  received_at_branch: 'Filialda qabul qilindi',
  in_processing: 'Ishlanmoqda',
  ready: 'Tayyor',
  out_for_delivery: 'Yetkazilmoqda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  received_at_branch: '#6366f1',
  in_processing: '#f59e0b',
  ready: '#22c55e',
  out_for_delivery: '#8b5cf6',
  completed: '#16a34a',
  cancelled: '#ef4444',
};

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['received_at_branch', 'cancelled'],
  received_at_branch: ['in_processing', 'cancelled'],
  in_processing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export interface JwtPayload {
  sub: string;
  role: string;
  branchIds?: string[];
  organizationId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const DEFAULT_ORG_SLUG = 'ximchistka-demo';

export const PROMO_CODES = {
  WELCOME10: { discountType: 'percent' as const, discountValue: 10 },
  SUMMER5000: { discountType: 'fixed' as const, discountValue: 5000 },
};

export const DISCOUNT_TYPES = ['percent', 'fixed'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export type ServiceDiscountFields = {
  discountType: string | null;
  discountValue: number | null;
  discountValidUntil?: string | Date | null;
};

export function isServiceDiscountActive(service: ServiceDiscountFields): boolean {
  if (!service.discountType || service.discountValue == null || service.discountValue <= 0) {
    return false;
  }
  if (!DISCOUNT_TYPES.includes(service.discountType as DiscountType)) return false;
  if (service.discountValidUntil) {
    return new Date(service.discountValidUntil) > new Date();
  }
  return true;
}

export function applyServiceDiscount(price: number, service: ServiceDiscountFields): number {
  if (!isServiceDiscountActive(service)) return price;
  if (service.discountType === 'percent') {
    return Math.max(0, Math.round(price * (1 - service.discountValue! / 100)));
  }
  if (service.discountType === 'fixed') {
    return Math.max(0, price - service.discountValue!);
  }
  return price;
}

export function discountLabel(service: ServiceDiscountFields): string | null {
  if (!isServiceDiscountActive(service)) return null;
  if (service.discountType === 'percent') return `-${service.discountValue}%`;
  if (service.discountType === 'fixed') return `-${service.discountValue} so'm`;
  return null;
}
