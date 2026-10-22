import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}

export const formatHours = (minutes: number): string => {
  const h = minutes / 60
  return (Math.round(h * 100) / 100).toString().replace('.', ',')
}

export const formatDuration = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60
  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours} h`
  return `${hours} h ${remainingMinutes} min`
}

export const formatDateItalian = (date: string): string => {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const formatDateLongItalian = (date: string): string => {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const calculateMinutes = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff < 0) diff += 1440
  return diff
}

export const DAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

export const toIsoDate = (d: Date): string => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export const getPeriodRange = (
  period: 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom',
  offset: number,
  customFrom?: string,
  customTo?: string
): [string, string] => {
  const now = new Date()
  now.setHours(12, 0, 0, 0)

  if (period === 'custom') {
    const today = toIsoDate(now)
    return [customFrom || today, customTo || today]
  }

  if (period === 'week') {
    const d = new Date(now)
    const dayOfWeek = (d.getDay() + 6) % 7 // Lunedì = 0
    d.setDate(d.getDate() - dayOfWeek + offset * 7)
    const end = new Date(d)
    end.setDate(d.getDate() + 6)
    return [toIsoDate(d), toIsoDate(end)]
  }

  const lengths: Record<string, number> = { month: 1, quarter: 3, semester: 6, year: 12 }
  const len = lengths[period]
  const m = now.getMonth()
  const startMonth =
    period === 'month'
      ? m
      : period === 'quarter'
      ? m - (m % 3)
      : period === 'semester'
      ? m - (m % 6)
      : 0

  const start = new Date(now.getFullYear(), startMonth + offset * len, 1, 12)
  const end = new Date(start.getFullYear(), start.getMonth() + len, 0, 12)
  return [toIsoDate(start), toIsoDate(end)]
}