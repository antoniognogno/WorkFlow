import { describe, expect, it } from 'vitest'
import { calculateMinutes, formatCurrency, formatDateLongItalian, formatDuration, getPeriodRange } from '@/lib/utils'

describe('time and money helpers', () => {
  it('calculates regular and overnight durations', () => {
    expect(calculateMinutes('09:00', '11:30')).toBe(150)
    expect(calculateMinutes('23:30', '01:00')).toBe(90)
  })

  it('formats durations and euro amounts for the Italian locale', () => {
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(formatCurrency(15)).toContain('15,00')
  })

  it('formats payment dates as readable Italian dates', () => {
    expect(formatDateLongItalian('2026-10-22')).toBe('22 ottobre 2026')
  })

  it('returns a complete Monday-to-Sunday week', () => {
    const [start, end] = getPeriodRange('week', 0)
    const startDate = new Date(`${start}T12:00:00`)
    const endDate = new Date(`${end}T12:00:00`)
    expect(startDate.getDay()).toBe(1)
    expect(endDate.getDay()).toBe(0)
  })
})
