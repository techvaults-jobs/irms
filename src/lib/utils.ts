import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency: string = '₦'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency}0`
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
}

/**
 * Format an amount using an ISO currency code (e.g. "NGN") from the API.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string = 'NGN',
  options: { compact?: boolean } = {}
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `
  if (isNaN(num)) return `${symbol}0`
  if (options.compact) {
    return `${symbol}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num)}`
  }
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? 0 : num
}

export function formatDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  })
}

/**
 * Turn a YYYY-MM-DD date into an inclusive end-of-day timestamp for range queries.
 */
export function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`
}

export function formatRelative(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 10) / 10} ${units[i]}`
}

export function getInitials(name?: string | null): string {
  if (!name) return 'U'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('')
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * The API returns errors either as `{ error: "msg" }` or, from Zod validation,
 * as `{ error: { message, details: [{ field, message }] } }`.
 */
export function getApiErrorMessage(data: any, fallback = 'Something went wrong'): string {
  const error = data?.error
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (Array.isArray(error.details) && error.details.length > 0) {
    return error.details.map((d: { message: string }) => d.message).join('. ')
  }
  if (typeof error.message === 'string') return error.message
  if (typeof error.reason === 'string') return error.reason
  return fallback
}

/**
 * fetch wrapper that throws an Error with the API's message on non-2xx.
 */
export async function apiFetch<T = any>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null
  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, `Request failed (${response.status})`))
  }
  return data as T
}

/**
 * Read a list from either a bare array or a `{ data: [...] }` envelope.
 */
export function asList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}
