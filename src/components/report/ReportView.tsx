import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateItalian, formatDuration, getPeriodRange, DAY_NAMES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Share2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Job {
  id: string
  name: string
  client: string
  rate: number
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
}

interface ReportViewProps {
  jobs: Job[]
  entries: Entry[]
}

type Period = 'last7' | 'last30' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'

export const ReportView: React.FC<ReportViewProps> = ({ jobs, entries }) => {
  const [period, setPeriod] = useState<Period>('last7')
  const [offset, setOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filter, setFilter] = useState('all')

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

  const getJob = (id: string) => jobs.find((j) => j.id === id) || { name: '?', client: '', rate: 0 }

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
  filteredEntries.forEach((e) => {
    const j = getJob(e.jobId)
    const key = `${j.name}${j.client ? ` · ${j.client}` : ''}`
    breakdown[key] = (breakdown[key] || 0) + (e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate)
  })

  // Generatore testo messaggio
  const generateMessage = () => {
    const lines = filteredEntries.map((e) => {
      const d = new Date(e.date + 'T12:00:00')
      const dayName = DAY_NAMES[d.getDay()]
      const dateFormatted = formatDateItalian(e.date)
      const hours = formatDuration(e.minutes)
      const euro = formatCurrency((e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate))
      const overtime = e.overtimeMinutes ? ` + ${formatDuration(e.overtimeMinutes)} extra` : ''
      return `${dayName} ${dateFormatted}: ${e.start}–${e.end} (${hours}${overtime}) → ${euro}`
    })
    return `${lines.join('\n')}\n\nTotale: ${formatDuration(totalMinutes)} = ${formatCurrency(totalPay)}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMessage())
    toast.success('Riepilogo copiato!')
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateMessage())}`, '_blank')
  }

  const uniqueClients = Array.from(new Set(jobs.map((j) => j.client).filter(Boolean)))

  return (
    <div className="space-y-4 pb-24">
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
              period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
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
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="select-modern"
      >
        <option value="all">Tutti i lavori</option>
        {jobs.map((j) => (
          <option key={j.id} value={`j:${j.id}`}>
            {j.name} {j.client ? `· ${j.client}` : ''}
          </option>
        ))}
        {uniqueClients.map((c) => (
          <option key={c} value={`c:${c}`}>
            Cliente: {c}
          </option>
        ))}
      </select>

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
                  <div>
                    <div className="font-semibold">
                      {DAY_NAMES[d.getDay()]} {formatDateItalian(e.date)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {e.start}–{e.end} · {formatDuration(e.minutes)}{e.overtimeMinutes ? ` + ${formatDuration(e.overtimeMinutes)} extra` : ''} · {j.name}
                      <span className="block text-muted-foreground/80">
                        Tariffa: {formatCurrency(e.rate)}/h{e.overtimeMinutes ? ` · Extra: ${formatCurrency(e.overtimeRate || e.rate)}/h` : ''}
                      </span>
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
      <div className="flex gap-2">
        <Button className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold flex items-center justify-center gap-2" onClick={handleWhatsApp}>
          <Share2 className="h-4 w-4" /> Invia su WhatsApp
        </Button>
        <Button variant="outline" onClick={handleCopy} className="px-4">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}