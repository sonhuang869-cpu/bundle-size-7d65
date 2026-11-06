import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function confidenceColor(level: string): string {
  switch (level) {
    case 'exact': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'high': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'low': return 'text-red-400 bg-red-400/10 border-red-400/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}

export function confidenceLabel(level: string): string {
  switch (level) {
    case 'exact': return 'Exact (100%)';
    case 'high': return 'High (95%+)';
    case 'medium': return 'Medium (80–94%)';
    case 'low': return 'Low (<80%)';
    default: return level;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'in-review': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'closed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'force-matched': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'written-off': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    case 'escalated': return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'deferred': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}

export function exceptionTypeLabel(type: string): string {
  switch (type) {
    case 'missing': return 'Missing Entry';
    case 'amount-diff': return 'Amount Difference';
    case 'timing': return 'Timing Difference';
    case 'duplicate': return 'Duplicate Entry';
    default: return type;
  }
}

export function agingBucketColor(bucket: string): string {
  switch (bucket) {
    case '<24h': return 'text-emerald-400 bg-emerald-400/10';
    case '1-3d': return 'text-amber-400 bg-amber-400/10';
    case '4-7d': return 'text-orange-400 bg-orange-400/10';
    case '>7d': return 'text-red-400 bg-red-400/10';
    default: return 'text-gray-400 bg-gray-400/10';
  }
}
