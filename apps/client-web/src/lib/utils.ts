import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, withTime = false) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('uz-UZ', { month: 'short', day: '2-digit' });
  if (!withTime) return dateStr;
  return `${dateStr}, ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
}
