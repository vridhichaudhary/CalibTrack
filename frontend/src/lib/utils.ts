import { format, parseISO } from 'date-fns';
import { AlertStatus } from '@/types';

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Returns Tailwind classes for the alert status badge and row
 * highlighting. critical (≤20 days) and overdue get the strongest
 * red treatment. warning (≤30 days) gets a softer amber/red.
 * This is the core visual logic the user asked for — instruments
 * with nearby due dates are immediately visible.
 */
export function getAlertStatusStyles(status: AlertStatus): {
  badge: string;
  row: string;
  label: string;
} {
  switch (status) {
    case 'overdue':
      return {
        badge: 'bg-red-600 text-white',
        row: 'bg-red-50 hover:bg-red-100 border-l-4 border-red-600',
        label: 'Overdue',
      };
    case 'critical':
      return {
        badge: 'bg-red-500 text-white',
        row: 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500',
        label: 'Critical (≤20 days)',
      };
    case 'warning':
      return {
        badge: 'bg-amber-500 text-white',
        row: 'bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-500',
        label: 'Due Soon (≤30 days)',
      };
    case 'upcoming':
      return {
        badge: 'bg-blue-100 text-blue-800',
        row: 'hover:bg-gray-50',
        label: 'Upcoming (≤90 days)',
      };
    case 'ok':
    default:
      return {
        badge: 'bg-green-100 text-green-800',
        row: 'hover:bg-gray-50',
        label: 'OK',
      };
  }
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
