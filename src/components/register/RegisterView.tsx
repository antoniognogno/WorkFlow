import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { calculateMinutes, formatCurrency, formatDuration } from '@/lib/utils'
import { Archive, BriefcaseBusiness, Clock3, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'

interface Job {
  id: string
  name: string
  client: string
  rate: number
  overtimeEnabled: boolean
  overtimeMultiplier: number
  presets: Array<{ id: string; start: string; end: string }>
}

interface Entry {
  id: string
  jobId: string
  date: string
  start: string
  end: string
  minutes: number
  rate: number
  paid: boolean
  breakMinutes: number
  overtimeMinutes: number
  overtimeRate: number
}

interface RegisterViewProps {
  jobs: Job[]
  entries: Entry[]
  trashEntries: Entry[]
  onAddEntry: (jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number) => Promise<void>
  onUpdateEntry: (id: string, jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number) => Promise<void>
  onDeleteEntry: (id: string) => Promise<void>
  onRestoreEntry: (id: string) => Promise<void>
  onPermanentlyDeleteEntry: (id: string) => Promise<void>
  onCreateJob: (name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number) => Promise<void>
}

const emptyForm = { jobId: '', date: '', start: '16:00', end: '18:00', breakMinutes: '0', overtimeMinutes: '0' }

export const RegisterView: React.FC<RegisterViewProps> = ({
  jobs, entries, trashEntries, onAddEntry, onUpdateEntry, onDeleteEntry, onRestoreEntry, onPermanentlyDeleteEntry, onCreateJob,
}) => {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ ...emptyForm, jobId: jobs[0]?.id ?? '', date: today })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [newJobName, setNewJobName] = useState('')
  const [newJobClient, setNewJobClient] = useState('')
  const [newJobRate, setNewJobRate] = useState('')
  const [newJobOvertime, setNewJobOvertime] = useState(false)
  const [newJobMultiplier, setNewJobMultiplier] = useState('1.5')
  const selectedJob = jobs.find((job) => job.id === form.jobId)
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`)), [entries])
  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, 5)
  const now = new Date()
  const monthKey = now.toISOString().slice(0, 7)
  const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey))
  const totalMinutes = (items: Entry[]) => items.reduce((sum, entry) => sum + entry.minutes + entry.overtimeMinutes, 0)
  const totalPay = (items: Entry[]) => items.reduce((sum, entry) => sum + (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate), 0)

  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submitEntry = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.jobId || !form.date || calculateMinutes(form.start, form.end) <= 0) return
    const breakMinutes = Math.max(0, Number(form.breakMinutes) || 0)
    const overtimeMinutes = Math.max(0, Number(form.overtimeMinutes) || 0)
    if (editingId) await onUpdateEntry(editingId, form.jobId, form.date, form.start, form.end, breakMinutes, overtimeMinutes)
    else await onAddEntry(form.jobId, form.date, form.start, form.end, breakMinutes, overtimeMinutes)
    setEditingId(null)
    setForm({ ...emptyForm, jobId: form.jobId, date: today })
  }
  const startEdit = (entry: Entry) => {
    setEditingId(entry.id)
    setForm({ jobId: entry.jobId, date: entry.date, start: entry.start, end: entry.end, breakMinutes: String(entry.breakMinutes), overtimeMinutes: String(entry.overtimeMinutes) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const createJob = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newJobName.trim()) return
    await onCreateJob(newJobName.trim(), newJobClient.trim(), Number(newJobRate) || 0, newJobOvertime, Number(newJobMultiplier) || 1.5)
    setNewJobName('')
    setNewJobClient('')
    setNewJobRate('')
    setNewJobOvertime(false)
  }

  return (
    <div className="space-y-4 pb-24">
      <div><p className="text-sm text-muted-foreground">Panoramica</p><h2 className="text-2xl font-black">Le tue ore</h2></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-[#29445a] bg-[#12283a]"><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9bb6c8]">Questo mese</p>
          <p className="mt-2 text-3xl font-black text-[#edf6fb]">{formatDuration(totalMinutes(monthEntries))}</p>
          <p className="mt-1 text-lg font-bold text-[#9fd0bd]">{formatCurrency(totalPay(monthEntries))}</p>
        </CardContent></Card>
        <Card className="border-[#51405b] bg-[#2a2432]"><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#c2aecb]">Attività recenti</p>
          <p className="mt-2 text-3xl font-black text-[#f5eff7]">{formatCurrency(totalPay(monthEntries))}</p>
          <p className="mt-1 text-xs text-[#c2aecb]">{entries.length} registrazioni · {trashEntries.length} nel cestino</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h3 className="font-bold">{editingId ? 'Modifica registrazione' : 'Registra attività'}</h3>{editingId && <button type="button" className="ml-auto text-muted-foreground" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></button>}</div>
        <form onSubmit={submitEntry} className="space-y-3">
          <select value={form.jobId} onChange={(event) => updateForm('jobId', event.target.value)} className="select-modern" required>
            <option value="">Scegli un lavoro</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name} · {formatCurrency(job.rate)}/h</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} required />
            <div className="grid grid-cols-2 gap-2"><Input type="time" value={form.start} onChange={(event) => updateForm('start', event.target.value)} required /><Input type="time" value={form.end} onChange={(event) => updateForm('end', event.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Pausa / riposo (min)<Input className="mt-1" type="number" min="0" step="5" value={form.breakMinutes} onChange={(event) => updateForm('breakMinutes', event.target.value)} /></label>
            <label className="text-xs text-muted-foreground">Straordinari (min)<Input className="mt-1" type="number" min="0" step="15" value={form.overtimeMinutes} onChange={(event) => updateForm('overtimeMinutes', event.target.value)} /></label>
          </div>
          {selectedJob?.overtimeEnabled && <p className="text-xs text-muted-foreground">Straordinari pagati {selectedJob.overtimeMultiplier}× ({formatCurrency(selectedJob.rate * selectedJob.overtimeMultiplier)}/h)</p>}
          {selectedJob?.presets.length ? <div className="flex flex-wrap gap-2">{selectedJob.presets.map((preset) => <button key={preset.id} type="button" onClick={() => setForm((current) => ({ ...current, start: preset.start, end: preset.end }))} className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/50">{preset.start} – {preset.end}</button>)}</div> : null}
          <Button type="submit" className="w-full" disabled={!selectedJob}>{editingId ? 'Salva modifiche' : 'Registra ora'}</Button>
        </form>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attività</p><p className="text-sm text-muted-foreground">Le ultime registrazioni, senza filtri</p></div><Archive className="h-5 w-5 text-primary" /></div>
        <div className="divide-y divide-border">{visibleEntries.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nessuna attività registrata</p> : visibleEntries.map((entry) => {
          const job = jobs.find((item) => item.id === entry.jobId)
          return <div key={entry.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.date} · {job?.name ?? 'Lavoro'}</p><p className="text-xs text-muted-foreground">{entry.start}–{entry.end} · lavorate {formatDuration(entry.minutes)}{entry.overtimeMinutes ? ` + ${formatDuration(entry.overtimeMinutes)} extra` : ''}</p><p className="text-xs text-muted-foreground">{entry.breakMinutes ? `Pausa: ${formatDuration(entry.breakMinutes)}` : 'Pausa: nessuna'} · Minuti lavorati: {entry.minutes + entry.overtimeMinutes}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label="Modifica entrata" onClick={() => startEdit(entry)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Sposta nel cestino" onClick={() => void onDeleteEntry(entry.id)}><Trash2 className="h-4 w-4 text-rose-300" /></Button></div></div>
        })}</div>
        {sortedEntries.length > 5 && <button type="button" className="mt-3 w-full text-xs font-semibold text-primary" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Mostra meno' : `Vedi tutte (${sortedEntries.length})`}</button>}
      </CardContent></Card>

      {trashEntries.length > 0 && <Card className="border-rose-900/60"><CardContent className="p-4">
        <button type="button" className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setShowTrash((value) => !value)}>Cestino ({trashEntries.length})<span className="text-xs text-muted-foreground">{showTrash ? 'Nascondi' : 'Apri'}</span></button>
        {showTrash && <div className="mt-2 divide-y divide-border">{trashEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between py-2 text-xs"><span>{entry.date} · {jobs.find((job) => job.id === entry.jobId)?.name ?? 'Lavoro'}</span><span className="flex gap-2"><button type="button" className="flex items-center gap-1 text-cyan-300" onClick={() => void onRestoreEntry(entry.id)}><RotateCcw className="h-3 w-3" /> Recupera</button><button type="button" className="text-rose-300" onClick={() => void onPermanentlyDeleteEntry(entry.id)}>Elimina</button></span></div>)}</div>}
      </CardContent></Card>}

      <Card><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /><h3 className="font-bold">Nuovo lavoro</h3></div><form onSubmit={createJob} className="space-y-2"><Input placeholder="Nome del lavoro" value={newJobName} onChange={(event) => setNewJobName(event.target.value)} required /><div className="grid grid-cols-2 gap-2"><Input placeholder="Cliente" value={newJobClient} onChange={(event) => setNewJobClient(event.target.value)} /><Input type="number" min="0" step="0.5" placeholder="€/ora" value={newJobRate} onChange={(event) => setNewJobRate(event.target.value)} required /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={newJobOvertime} onChange={(event) => setNewJobOvertime(event.target.checked)} /> Straordinari maggiorati {newJobOvertime && <Input className="ml-auto h-8 w-20" type="number" min="1" step="0.1" value={newJobMultiplier} onChange={(event) => setNewJobMultiplier(event.target.value)} />}</label><Button type="submit" className="w-full"><Plus className="mr-1 h-4 w-4" /> Crea lavoro</Button></form></CardContent></Card>
    </div>
  )
}
