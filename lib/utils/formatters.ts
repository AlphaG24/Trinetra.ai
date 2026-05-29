// lib/utils/formatters.ts

/**
 * Format a number to Indian Rupees (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format an integer into Indian numbering system (1,00,000)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

/**
 * Format seconds into a MM:SS string
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Calculate percentage change between two numbers
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
