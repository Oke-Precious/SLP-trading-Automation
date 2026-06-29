/**
 * @file formatters.ts
 * @description Price, percentage, and date formatters to keep numerical displays elegant.
 */

import { format } from 'date-fns';

export const formatPrice = (price: number): string => {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatExtendedPrice = (price: number): string => {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
};

export const formatPercentage = (val: number): string => {
  const prefix = val >= 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
};

export const resolveSafeDate = (val: any): Date => {
  if (!val) return new Date();
  
  // Handle Firestore Timestamp object or custom object with seconds/nanoseconds
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate();
      } catch (e) {}
    }
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000);
    }
    // Any fallback if object contains milliseconds
    if (typeof val.toMillis === 'function') {
      try {
        return new Date(val.toMillis());
      } catch (e) {}
    }
  }

  // Handle number timestamps
  if (typeof val === 'number') {
    return new Date(val);
  }

  // Handle strings
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    
    // Check if the string is just a numeric timestamp
    const num = Number(val);
    if (!isNaN(num)) return new Date(num);
  }

  const fallbackDate = new Date(val);
  if (!isNaN(fallbackDate.getTime())) return fallbackDate;
  
  return new Date();
};

export const formatDateTime = (dateStr: any): string => {
  const d = resolveSafeDate(dateStr);
  return format(d, 'yyyy-MM-dd HH:mm:ss');
};

export const formatTimeAgo = (dateStr: any): string => {
  const d = resolveSafeDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return format(d, 'MMM dd, HH:mm');
};

// Aliases and specific formats requested by user test scenarios
export const formatPercent = (val: number): string => {
  const percentage = val * 100;
  const prefix = percentage >= 0 ? '+' : '';
  // Check if it ends in .00 to match formatting or fixed 2 decimal places
  return `${prefix}${percentage.toFixed(2)}%`;
};

export const formatDate = (dateStr: any): string => {
  const d = resolveSafeDate(dateStr);
  return format(d, 'MMM dd, yyyy');
};

export const timeAgo = (dateStr: any): string => {
  const d = resolveSafeDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} days ago`;
};
