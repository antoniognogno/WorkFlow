import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDateItalian, formatDuration, getPeriodRange, DAY_NAMES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Share2, Copy, Download, TrendingUp, TrendingDown, Target, CalendarCheck, Trophy, Clock3, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDefaultJobColor } from '@/lib/job-colors'
import { loadGoals } from '@/lib/goals'

interface Job {
  id: string
  name: string
  client: string
  rate: number
  color: string
}

interface Entry {
  id: string
  jobId: string
  date: string
  start: string
  end: string
  minutes: number
  rate: number
  overtimeMinutes: number
  overtimeRate: number
  paid: boolean
  paidAt: string | null
  paymentMethod: string | null
  note?: string
}

interface ReportViewProps {
  jobs: Job[]
  entries: Entry[]
}

type Period = 'last7' | 'last30' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'

interface JobChartTooltipProps {
  active?: boolean
  payload?: Array<{
    value?: number
    payload?: {
      name?: string
      value?: number
      color?: string
    }
  }>
}

const JobChartTooltip = ({ active, payload }: JobChartTooltipProps) => {
  const item = payload?.[0]?.payload
  if (!active || !item) return null

  return (
    <div className="chart-touch-tooltip min-w-36 rounded-2xl border border-border/90 bg-card px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
      <p className="mb-1 text-xs font-bold" style={{ color: item.color || 'var(--foreground)' }}>
        {item.name || 'Lavoro'}
      </p>
      <p className="text-base font-black text-foreground">
        {formatCurrency(Number(payload[0].value ?? item.value ?? 0))}
      </p>
    </div>
  )
}

export const ReportView: React.FC<ReportViewProps> = ({ jobs, entries }) => {
  const [reportView, setReportView] = useState<'dashboard' | 'detail'>(() =>
    localStorage.getItem('workflow-report-view') === 'detail' ? 'detail' : 'dashboard',
  )
  const [goals] = useState(() => loadGoals())
  const [period, setPeriod] = useState<Period>('last30')
  const [offset, setOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filter, setFilter] = useState('all')
  const [groupSameName, setGroupSameName] = useState(false)
  const [totalTemplate, setTotalTemplate] = useState(
    localStorage.getItem('report_total_template') || 'Totale: {ore} = {euro}'
  )

  const getRollingRange = (days: number): [string, string] => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  }
  const [startDate, endDate] = period === 'last7'
    ? getRollingRange(7)
    : period === 'last30'
      ? getRollingRange(30)
      : getPeriodRange(period, offset, customFrom, customTo)

  const getJob = (id: string): Job =>
    jobs.find((j) => j.id === id) || { id: '', name: '?', client: '', rate: 0, color: getDefaultJobColor(0) }

  // Filtro temporale ed entità
  const filteredEntries = entries
    .filter((e) => {
      const matchDate = e.date >= startDate && e.date <= endDate
      if (!matchDate) return false
      if (filter === 'all') return true
      if (filter.startsWith('j:')) return e.jobId === filter.slice(2)
      if (filter.startsWith('c:')) return getJob(e.jobId).client === filter.slice(2)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))

  const totalMinutes = filteredEntries.reduce((acc, cur) => acc + cur.minutes + cur.overtimeMinutes, 0)
  const totalPay = filteredEntries.reduce((acc, cur) => acc + (cur.minutes / 60) * cur.rate + (cur.overtimeMinutes / 60) * (cur.overtimeRate || cur.rate), 0)
  // Ripartizione per lavoro/cliente
  const breakdown: Record<string, number> = {}
  const breakdownColors: Record<string, string> = {}
  filteredEntries.forEach((e) => {
    const j = getJob(e.jobId)
    const key = groupSameName ? j.name : `${j.name}${j.client ? ` · ${j.client}` : ''}`
    breakdown[key] = (breakdown[key] || 0) + (e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate)
    breakdownColors[key] = j.color || getDefaultJobColor(jobs.indexOf(j))
  })

  const trendData = useMemo(() => {
    const grouped = new Map<string, { hours: number; earnings: number }>()
    filteredEntries.forEach((entry) => {
      const current = grouped.get(entry.date) ?? { hours: 0, earnings: 0 }
      const minutes = entry.minutes + entry.overtimeMinutes
      current.hours += minutes / 60
      current.earnings += (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate)
      grouped.set(entry.date, current)
    })
    return Array.from(grouped.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, values]) => ({
        date: new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        hours: Number(values.hours.toFixed(2)),
        earnings: Number(values.earnings.toFixed(2)),
      }))
  }, [filteredEntries])

  const breakdownData = Object.entries(breakdown)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
      color: breakdownColors[name] || '#7aa6bd',
    }))
    .sort((first, second) => second.value - first.value)
    .slice(0, 6)

  const comparison = useMemo(() => {
    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)
    const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const previousEnd = new Date(start)
    previousEnd.setDate(previousEnd.getDate() - 1)
    const previousStart = new Date(previousEnd)
    previousStart.setDate(previousStart.getDate() - dayCount + 1)
    const previousFrom = previousStart.toISOString().slice(0, 10)
    const previousTo = previousEnd.toISOString().slice(0, 10)
    const previousEntries = entries.filter((entry) => entry.date >= previousFrom && entry.date <= previousTo)
    const previousPay = previousEntries.reduce((sum, entry) =>
      sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate),
    0)
    const variation = previousPay > 0 ? ((totalPay - previousPay) / previousPay) * 100 : totalPay > 0 ? 100 : 0
    return { previousPay, variation }
  }, [entries, endDate, startDate, totalPay])

  const dashboard = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)
    const monthFrom = monthStart.toISOString().slice(0, 10)
    const monthTo = monthEnd.toISOString().slice(0, 10)
    const monthEntries = entries.filter((entry) => entry.date >= monthFrom && entry.date <= monthTo)
    const monthMinutes = monthEntries.reduce((sum, entry) => sum + entry.minutes + entry.overtimeMinutes, 0)
    const monthPay = monthEntries.reduce((sum, entry) =>
      sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate),
    0)
    const paidPay = monthEntries.filter((entry) => entry.paid).reduce((sum, entry) =>
      sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate),
    0)
    const workdays = new Set(monthEntries.map((entry) => entry.date)).size

    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12)
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 12)
    const previousEntries = entries.filter((entry) =>
      entry.date >= previousStart.toISOString().slice(0, 10) &&
      entry.date <= previousEnd.toISOString().slice(0, 10),
    )
    const previousPay = previousEntries.reduce((sum, entry) =>
      sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate),
    0)
    const earningsVariation = previousPay > 0 ? ((monthPay - previousPay) / previousPay) * 100 : monthPay > 0 ? 100 : 0

    const weekly = new Map<number, { hours: number; earnings: number }>()
    monthEntries.forEach((entry) => {
      const date = new Date(`${entry.date}T12:00:00`)
      const week = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)
      const current = weekly.get(week) ?? { hours: 0, earnings: 0 }
      current.hours += (entry.minutes + entry.overtimeMinutes) / 60
      current.earnings += (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate)
      weekly.set(week, current)
    })
    const weeklyData = Array.from(weekly.entries())
      .sort(([first], [second]) => first - second)
      .map(([week, values]) => ({
        week: `Sett. ${week}`,
        hours: Number(values.hours.toFixed(2)),
        earnings: Number(values.earnings.toFixed(2)),
      }))

    const remainingDays = Math.max(1, monthEnd.getDate() - now.getDate() + 1)
    const remainingHours = Math.max(0, (goals.monthlyHours * 60 - monthMinutes) / 60)
    const remainingEarnings = Math.max(0, goals.monthlyEarnings - monthPay)

    const jobProgress = jobs.map((job) => {
      const target = goals.jobMonthlyEarnings[job.id] ?? 0
      const pay = monthEntries
        .filter((entry) => entry.jobId === job.id)
        .reduce((sum, entry) => sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate), 0)
      return { id: job.id, name: job.name, client: job.client, color: job.color, target, pay }
    }).filter((item) => item.target > 0)

    return {
      monthEntries,
      monthMinutes,
      monthPay,
      paidPay,
      outstandingPay: Math.max(0, monthPay - paidPay),
      workdays,
      earningsVariation,
      weeklyData,
      remainingDays,
      remainingHours,
      remainingEarnings,
      jobProgress,
      monthLabel: now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    }
  }, [entries, goals, jobs])

  // Generatore testo messaggio
  const generateMessage = () => {
    const lines = filteredEntries.map((e) => {
      const d = new Date(e.date + 'T12:00:00')
      const dayName = DAY_NAMES[d.getDay()]
      const dateFormatted = formatDateItalian(e.date)
      const hours = formatDuration(e.minutes)
      const euro = formatCurrency((e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate))
      const overtime = e.overtimeMinutes ? ` + ${formatDuration(e.overtimeMinutes)} extra` : ''
      const note = e.note?.trim() ? `\nNota: ${e.note.trim()}` : ''
      return `${dayName} ${dateFormatted}: ${e.start}–${e.end} (${hours}${overtime}) → ${euro}${note}`
    })
    const totalLine = totalTemplate
      .replaceAll('{ore}', formatDuration(totalMinutes))
      .replaceAll('{euro}', formatCurrency(totalPay))
    return `${lines.join('\n')}\n\n${totalLine}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMessage())
    toast.success('Riepilogo copiato!')
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateMessage())}`, '_blank')
  }

  const handleExportCsv = () => {
    const header = ['Data', 'Inizio', 'Fine', 'Lavoro', 'Cliente', 'Ore', 'Straordinari', 'Compenso', 'Note']
    const rows = filteredEntries.map((entry) => {
      const job = getJob(entry.jobId)
      const amount = (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate)
      return [
        entry.date,
        entry.start,
        entry.end,
        job.name,
        job.client,
        (entry.minutes / 60).toFixed(2),
        (entry.overtimeMinutes / 60).toFixed(2),
        amount.toFixed(2),
        entry.note ?? '',
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow-report-${startDate}-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Report CSV esportato')
  }

  const uniqueClients = Array.from(new Set(jobs.map((j) => j.client).filter(Boolean)))

  return (
    <div className="view-enter space-y-4 pb-24">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
        {([
          ['dashboard', 'Dashboard'],
          ['detail', 'Dettaglio'],
        ] as const).map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => {
              setReportView(view)
              localStorage.setItem('workflow-report-view', view)
            }}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${reportView === view ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {reportView === 'dashboard' ? (
        <div className="view-enter space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Riepilogo mensile</p>
              <h2 className="text-2xl font-black capitalize">{dashboard.monthLabel}</h2>
            </div>
            {dashboard.earningsVariation !== 0 && (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${dashboard.earningsVariation >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {dashboard.earningsVariation >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {dashboard.earningsVariation >= 0 ? '+' : ''}{dashboard.earningsVariation.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <Clock3 className="h-4 w-4 text-primary" />
                <p className="mt-3 text-2xl font-black">{formatDuration(dashboard.monthMinutes)}</p>
                <p className="text-xs text-muted-foreground">ore lavorate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <p className="mt-3 text-2xl font-black">{dashboard.workdays}</p>
                <p className="text-xs text-muted-foreground">giornate lavorate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Guadagno del mese</p>
                  <p className="mt-1 text-3xl font-black text-success">{formatCurrency(dashboard.monthPay)}</p>
                </div>
                <WalletCards className="h-7 w-7 text-primary/70" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-success/10 px-3 py-2">
                  <p className="text-muted-foreground">Pagato</p>
                  <p className="mt-1 font-black text-success">{formatCurrency(dashboard.paidPay)}</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 px-3 py-2">
                  <p className="text-muted-foreground">Da ricevere</p>
                  <p className="mt-1 font-black text-amber-500">{formatCurrency(dashboard.outstandingPay)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {goals.monthlyHours > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><p className="text-sm font-bold">Obiettivo ore</p></div>
                  <p className="text-sm font-black">{formatDuration(dashboard.monthMinutes)} / {goals.monthlyHours} h</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${Math.min(100, (dashboard.monthMinutes / 60 / goals.monthlyHours) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dashboard.remainingHours > 0
                    ? `${dashboard.remainingHours.toFixed(1)} h restanti · circa ${(dashboard.remainingHours / dashboard.remainingDays).toFixed(1)} h al giorno`
                    : 'Obiettivo mensile raggiunto'}
                </p>
              </CardContent>
            </Card>
          )}

          {goals.monthlyEarnings > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-success" /><p className="text-sm font-bold">Obiettivo guadagno</p></div>
                  <p className="text-sm font-black">{Math.min(100, (dashboard.monthPay / goals.monthlyEarnings) * 100).toFixed(0)}%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-700"
                    style={{ width: `${Math.min(100, (dashboard.monthPay / goals.monthlyEarnings) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dashboard.remainingEarnings > 0
                    ? `${formatCurrency(dashboard.remainingEarnings)} mancanti · circa ${formatCurrency(dashboard.remainingEarnings / dashboard.remainingDays)} al giorno`
                    : 'Obiettivo mensile raggiunto'}
                </p>
              </CardContent>
            </Card>
          )}

          {dashboard.jobProgress.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-bold">Obiettivi per lavoro</p>
                <div className="mt-3 space-y-3">
                  {dashboard.jobProgress.map((item) => {
                    const progress = item.target > 0 ? Math.min(100, (item.pay / item.target) * 100) : 0
                    return (
                      <div key={item.id}>
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="font-bold" style={{ color: item.color }}>{item.name}{item.client ? ` · ${item.client}` : ''}</span>
                          <span className="font-semibold">{formatCurrency(item.pay)} / {formatCurrency(item.target)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${progress}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {dashboard.weeklyData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-bold">Andamento settimanale</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Ore e guadagni mese corrente</p>
                <div className="mt-3 h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} formatter={(value, name) => name === 'earnings' ? [formatCurrency(Number(value)), 'Guadagno'] : [`${Number(value).toFixed(1)} h`, 'Ore']} />
                      <Bar dataKey="hours" fill="#7aa6bd" radius={[8, 8, 2, 2]} />
                      <Bar dataKey="earnings" fill="#79b8ad" radius={[8, 8, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
      {/* Selettore Periodo */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
        {[
          ['last7', '7 giorni'],
          ['last30', '30 giorni'],
          ['week', 'Settimana'],
          ['month', 'Mese'],
          ['quarter', 'Trim.'],
          ['semester', 'Sem.'],
          ['year', 'Anno'],
          ['custom', 'Date'],
        ].map(([p, label]) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p as Period)
              setOffset(0)
            }}
            className={`rounded-lg px-1 py-2 text-[11px] font-semibold whitespace-nowrap transition-all ${
              period === p ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Navigatore Offset o Selettore Range Custom */}
      {period === 'custom' ? (
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between px-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            {formatDateItalian(startDate)} – {formatDateItalian(endDate)}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filtro Lavori / Clienti */}
      <Select
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tutti i lavori' },
          ...jobs.map((j) => ({ value: `j:${j.id}`, label: `${j.name} ${j.client ? `· ${j.client}` : ''}` })),
          ...uniqueClients.map((c) => ({ value: `c:${c}`, label: `Cliente: ${c}` })),
        ]}
      />
      <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={groupSameName} onChange={(event) => setGroupSameName(event.target.checked)} className="h-4 w-4 accent-primary" />
        Raggruppa nel riepilogo i lavori con lo stesso nome
      </label>

      {/* Scheda Totali */}
      <Card className="bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Ore Totali</div>
              <div className="text-2xl font-black">{formatDuration(totalMinutes)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Totale Guadagno</div>
              <div className="text-2xl font-black text-success">{formatCurrency(totalPay)}</div>
            </div>
          </div>

          {Object.keys(breakdown).length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              {Object.entries(breakdown).map(([name, sum]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-semibold">{formatCurrency(sum)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {comparison.variation >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Rispetto al periodo precedente
            </div>
            <p className={`mt-2 text-xl font-black ${comparison.variation >= 0 ? 'text-success' : 'text-destructive'}`}>
              {comparison.variation >= 0 ? '+' : ''}{comparison.variation.toFixed(1)}%
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Prima: {formatCurrency(comparison.previousPay)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Medie giornaliere</p>
            <p className="mt-2 text-xl font-black">{formatDuration(trendData.length ? Math.round(totalMinutes / trendData.length) : 0)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">ore / giorno attivo</p>
          </CardContent>
        </Card>
      </div>

      {trendData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Andamento guadagni</p>
                <p className="text-[11px] text-muted-foreground">Entrate nel periodo selezionato</p>
              </div>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#79b8ad" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#79b8ad" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.35 }}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Guadagno']}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#79b8ad" strokeWidth={3} fill="url(#earningsGradient)" activeDot={{ r: 5, strokeWidth: 2, fill: '#79b8ad' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {breakdownData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold">Guadagni per lavoro</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Scopri subito quali lavori rendono di più</p>
            <div className="mt-3 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 2 }}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} vertical={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={82} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(0, 11)} />
                  <Tooltip
                    cursor={{ fill: 'var(--primary)', fillOpacity: 0.06 }}
                    content={<JobChartTooltip />}
                    isAnimationActive={false}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} activeBar={false} isAnimationActive>
                    {breakdownData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {breakdownData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold">Ripartizione per lavoro</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Incidenza sul guadagno totale</p>
            <div className="mt-2 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={<JobChartTooltip />}
                    isAnimationActive={false}
                  />
                  <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={3} labelLine={false} activeShape={false} isAnimationActive>
                    {breakdownData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {breakdownData.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="chart-legend-item min-w-0 rounded-xl px-2 py-1.5 text-left text-[11px] transition-colors active:scale-[0.98]"
                  onClick={() => toast(`${item.name} · ${formatCurrency(item.value)}`, { icon: '●', style: { color: item.color } })}
                  aria-label={`${item.name}, ${formatCurrency(item.value)}`}
                >
                  <span className="block truncate font-semibold" style={{ color: item.color }}>{item.name}</span>
                  <strong className="text-foreground">{formatCurrency(item.value)}</strong>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-4">
          <label htmlFor="report-total-template" className="text-xs font-semibold text-muted-foreground">
            Riga finale del report
          </label>
          <Input
            id="report-total-template"
            value={totalTemplate}
            onChange={(event) => {
              setTotalTemplate(event.target.value)
              localStorage.setItem('report_total_template', event.target.value)
            }}
            placeholder="Totale: {ore} = {euro}"
            aria-describedby="report-total-hint"
          />
          <p id="report-total-hint" className="text-[11px] text-muted-foreground">
            Usa {'{ore}'} per le ore totali e {'{euro}'} per il compenso.
          </p>
        </CardContent>
      </Card>

      {/* Lista Voci nel Periodo */}
      <Card>
        <CardContent className="p-4 divide-y divide-border">
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-3">Nessuna ora nel periodo selezionato</p>
          ) : (
            filteredEntries.map((e) => {
              const j = getJob(e.jobId)
              const d = new Date(e.date + 'T12:00:00')
              return (
                <div key={e.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div className="flex min-w-0 items-start gap-2">
                    <div>
                    <div className="font-semibold">
                      {DAY_NAMES[d.getDay()]} {formatDateItalian(e.date)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {e.start}–{e.end} · {formatDuration(e.minutes)}{e.overtimeMinutes ? ` + ${formatDuration(e.overtimeMinutes)} extra` : ''} · {j.name}
                      <span className="block text-muted-foreground/80">
                        Tariffa: {formatCurrency(e.rate)}/h{e.overtimeMinutes ? ` · Extra: ${formatCurrency(e.overtimeRate || e.rate)}/h` : ''}
                      </span>
                      {e.note?.trim() && (
                        <span className="mt-1 block border-l-2 border-primary/40 pl-2 italic text-muted-foreground">
                          {e.note.trim()}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>
                  <span className="font-bold text-success text-sm">
                    {formatCurrency((e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate))}
                  </span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Azioni Rapide Condivisione */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Button className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold flex items-center justify-center gap-2" onClick={handleWhatsApp}>
          <Share2 className="h-4 w-4" /> Invia su WhatsApp
        </Button>
        <Button variant="outline" onClick={handleExportCsv} className="px-3" aria-label="Esporta report CSV">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleCopy} className="px-4">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
        </>
      )}
    </div>
  )
}