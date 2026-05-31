import { format, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export const formatDate = (date: string | null): string => {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy')
}

export const formatDateTime = (date: string | null): string => {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy, h:mm a')
}

export const formatRelative = (date: string | null): string => {
  if (!date) return '-'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const formatPercent = (value: number): string => `${value}%`

export const getNextPayoutDate = (payoutDay: number): string => {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, payoutDay)
  return format(next, 'dd MMM yyyy')
}

export const capitalize = (value: string | null | undefined): string => {
  if (!value) return '-'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const ordinal = (value: number): string => {
  const mod10 = value % 10
  const mod100 = value % 100

  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

export const formatPayoutMethod = (value: string | null | undefined): string => {
  if (!value) return '-'
  return value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
