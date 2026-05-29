'use client';

import { cn } from '@/lib/utils';

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

const roleRing: Record<string, string> = {
  super_admin: 'ring-rose-400/40',
  branch_manager: 'ring-blue-400/40',
  operator: 'ring-slate-300',
  courier: 'ring-amber-400/40',
};

export function StaffAvatar({
  name,
  src,
  role,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  role?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold ring-2',
        roleRing[role ?? ''] ?? 'ring-border',
        sizeClasses[size],
        !src && 'bg-primary/10 text-primary',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  );
}
