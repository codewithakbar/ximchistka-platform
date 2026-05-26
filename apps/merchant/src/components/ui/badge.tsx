import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@ximchistka/shared';

type Variant = 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'secondary';

const variants: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  destructive: 'bg-red-500/10 text-red-700 border-red-500/20',
  secondary: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const statusVariants: Record<OrderStatus, Variant> = {
  draft: 'secondary',
  submitted: 'info',
  received_at_branch: 'info',
  in_processing: 'warning',
  ready: 'success',
  out_for_delivery: 'info',
  completed: 'success',
  cancelled: 'destructive',
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <Badge variant={statusVariants[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
