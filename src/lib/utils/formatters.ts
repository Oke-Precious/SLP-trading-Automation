/**
 * @file formatters.ts
 * @description Price, percentage, and date formatters to keep numerical displays elegant.
 */

import { format } from 'date-fns';

export const formatPrice = (price: number): string => {
  if (price === 0) return '$0.00';
  if (price < 1) return `$${price.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export const formatExtendedPrice = (price: number): string => {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
};

export const formatPercentage = (val: number): string => {
  const prefix = val >= 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
};

export const formatDateTime = (dateStr: string | number): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, 'yyyy-MM-dd HH:mm:ss');
};

export const formatTimeAgo = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return format(d, 'MMM dd, HH:mm');
};
