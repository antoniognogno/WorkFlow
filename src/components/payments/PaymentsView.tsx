import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateItalian, formatDuration, getPeriodRange } from '@/lib/utils'
import { ArrowLeft, CalendarRange, CheckCircle2, ChevronDown, Pencil, ReceiptText, WalletCards } from 'lucide-react'
import { Select } from '@/components/ui/select'

interface Job {
  id: string
  name: string
  client: string
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
  paymentNote: string | null
}

interface PaymentsViewProps {
  jobs: Job[]
  entries: Entry[]
  onMarkEntriesPaid: (ids: string[], paidDate: string, paymentMethod: string | null, paymentNote: string | null) => Promise<void>
  onUpdatePayment: (id: string, paidDate: string, paymentMethod: string | null, paymentNote: string | null) => Promise<void>
  onCancelPayment: (id: string) => Promise<void>
}

type Period = 'last30' | 'month' | 'quarter' | 'custom'
type StatementPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'

const amountFor = (entry: Entry) =>
  (entry.minutes / 60) * entry.rate + (entry.overtimeMinutes / 60) * (entry.overtimeRate || entry.rate)

const rollingRange = (days: number): [string, string] => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ jobs, entries, onMarkEntriesPaid, onUpdatePayment, onCancelPayment }) => {
  const [period, setPeriod] = useState<Period>('last30')
  const [offset, setOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showPaid, setShowPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentNote, setPaymentNote] = useState('')
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [showStatement, setShowStatement] = useState(false)
  const [statementPeriod, setStatementPeriod] = useState<StatementPeriod>('month')
  const [statementOffset, setStatementOffset] = useState(0)
  const [statementFrom, setStatementFrom] = useState('')
  const [statementTo, setStatementTo] = useState('')
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('')
  const [editPaymentNote, setEditPaymentNote] = useState('')
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null)
  const [cancelConfirmation, setCancelConfirmation] = useState('')

  const [startDate, endDate] = period === 'last30'
    ? rollingRange(30)
    : period === 'custom'
      ? getPeriodRange('custom', 0, customFrom, customTo)
      : getPeriodRange(period, offset)

  const getJob = (id: string) => jobs.find((job) => job.id === id)
  const periodEntries = entries.filter((entry) => entry.date >= startDate && entry.date <= endDate)
  const unpaidEntries = periodEntries.filter((entry) => !entry.paid)
  const paidEntries = periodEntries.filter((entry) => entry.paid)
  const allPaidEntries = [...entries]
    .filter((entry) => entry.paid)
    .sort((first, second) => (second.paidAt ?? second.date).localeCompare(first.paidAt ?? first.date))
  const [statementStart, statementEnd] = statementPeriod === 'day'
    ? rollingRange(1)
    : statementPeriod === 'custom'
      ? getPeriodRange('custom', 0, statementFrom, statementTo)
      : getPeriodRange(statementPeriod, statementOffset)
  const statementEntries = allPaidEntries.filter((entry) => {
    const paymentDate = entry.paidAt?.slice(0, 10) ?? entry.date
    return paymentDate >= statementStart && paymentDate <= statementEnd
  })
  const statementTotal = statementEntries.reduce((sum, entry) => sum + amountFor(entry), 0)

  const beginPaymentEdit = (entry: Entry) => {
    setEditingPaymentId(entry.id)
    setEditPaymentDate(entry.paidAt?.slice(0, 10) ?? entry.date)
    setEditPaymentMethod(entry.paymentMethod ?? '')
    setEditPaymentNote(entry.paymentNote ?? '')
    setCancelPaymentId(null)
  }

  const savePaymentEdit = async () => {
    if (!editingPaymentId || !editPaymentDate) return
    await onUpdatePayment(editingPaymentId, editPaymentDate, editPaymentMethod || null, editPaymentNote.trim() || null)
    setEditingPaymentId(null)
  }

  const confirmPaymentCancellation = async () => {
    if (!cancelPaymentId || cancelConfirmation !== 'Annulla') return
    await onCancelPayment(cancelPaymentId)
    setCancelPaymentId(null)
    setCancelConfirmation('')
  }

  const renderPaidEntry = (entry: Entry) => {
    const isEditing = editingPaymentId === entry.id
    const isCancelling = cancelPaymentId === entry.id
    return (
      <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-success/30 bg-card text-success"><CheckCircle2 className="h-4 w-4" /></div>
        {isEditing ? <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold">Modifica dettagli pagamento</p>
          <input type="date" value={editPaymentDate} onChange={(event) => setEditPaymentDate(event.target.value)} className="select-modern" aria-label="Data pagamento modificata" />
          <Select value={editPaymentMethod} onChange={setEditPaymentMethod} options={[{ value: '', label: 'Non specificato' }, { value: 'bonifico', label: 'Bonifico bancario' }, { value: 'contanti', label: 'Contanti' }, { value: 'carta', label: 'Carta' }, { value: 'paypal', label: 'PayPal' }, { value: 'altro', label: 'Altro' }]} />
          <input type="text" value={editPaymentNote} onChange={(event) => setEditPaymentNote(event.target.value)} placeholder="Nota o riferimento" className="select-modern" maxLength={120} aria-label="Nota pagamento modificata" />
          <div className="flex gap-2"><Button size="sm" onClick={() => void savePaymentEdit()}>Salva</Button><Button size="sm" variant="outline" onClick={() => setEditingPaymentId(null)}>Annulla</Button></div>
        </div> : <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{getJob(entry.jobId)?.name ?? 'Lavoro'}{getJob(entry.jobId)?.client ? ` · ${getJob(entry.jobId)?.client}` : ''}</p><p className="text-[11px] text-muted-foreground">{entry.paidAt ? `Ricevuto il ${formatDateItalian(entry.paidAt.slice(0, 10))}` : `Registrato il ${formatDateItalian(entry.date)}`}{entry.paymentMethod ? ` · ${entry.paymentMethod}` : ''}{entry.paymentNote ? ` · ${entry.paymentNote}` : ''}</p></div>}
        {!isEditing && <div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => beginPaymentEdit(entry)} aria-label="Modifica dettagli pagamento"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => { setCancelPaymentId(entry.id); setCancelConfirmation('') }}>Annulla pagamento</Button></div>}
        <span className="text-sm font-bold text-success">{formatCurrency(amountFor(entry))}</span>
        {isCancelling && <div className="w-full rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-xs"><p className="font-semibold text-destructive">Le ore resteranno, ma questo importo tornerà tra quelli da ricevere.</p><p className="mt-1 text-muted-foreground">Scrivi esattamente <strong>Annulla</strong> per confermare.</p><input value={cancelConfirmation} onChange={(event) => setCancelConfirmation(event.target.value)} placeholder="Scrivi Annulla" className="select-modern mt-2" aria-label="Conferma annullamento pagamento" /><div className="mt-2 flex gap-2"><Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={cancelConfirmation !== 'Annulla'} onClick={() => void confirmPaymentCancellation()}>Conferma annullamento</Button><Button size="sm" variant="outline" onClick={() => setCancelPaymentId(null)}>Indietro</Button></div></div>}
      </div>
    )
  }

  if (showStatement) {
    return (
      <div className="space-y-4 pb-24">
        <button type="button" onClick={() => setShowStatement(false)} className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Torna ai pagamenti
        </button>
        <div>
          <p className="text-sm text-muted-foreground">Incassi</p>
          <h2 className="text-2xl font-black">Estratto conto</h2>
          <p className="mt-1 text-xs text-muted-foreground">Storico degli importi ricevuti nel periodo selezionato.</p>
        </div>

        <Card className="border-primary/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-primary/30 bg-card p-2 text-primary"><ReceiptText className="h-5 w-5" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totale ricevuto</p><p className="mt-1 text-3xl font-black text-success">{formatCurrency(statementTotal)}</p></div>
              </div>
              <p className="text-right text-xs text-muted-foreground">{statementEntries.length} {statementEntries.length === 1 ? 'operazione' : 'operazioni'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><p className="text-sm font-bold">Intervallo estratto conto</p></div>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
              {([['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese'], ['quarter', 'Trim.'], ['semester', '6 mesi'], ['year', 'Anno'], ['custom', 'Date']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => { setStatementPeriod(value); setStatementOffset(0) }} className={`rounded-lg px-1 py-2 text-[11px] font-semibold ${statementPeriod === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            {statementPeriod === 'custom' ? (
              <div className="flex gap-2">
                <input type="date" value={statementFrom} onChange={(event) => setStatementFrom(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Data iniziale estratto conto" />
                <input type="date" value={statementTo} onChange={(event) => setStatementTo(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Data finale estratto conto" />
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => setStatementOffset((value) => value - 1)} aria-label="Intervallo precedente">←</button>
                <span>{formatDateItalian(statementStart)} – {formatDateItalian(statementEnd)}</span>
                <button type="button" onClick={() => setStatementOffset((value) => value + 1)} aria-label="Intervallo successivo">→</button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {statementEntries.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nessun incasso nel periodo selezionato.</p> : (
              <div className="divide-y divide-border">
                {statementEntries.map(renderPaidEntry)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }
  const selectedEntries = unpaidEntries.filter((entry) => selectedIds.includes(entry.id))
  const selectedJobIds = new Set(selectedEntries.map((entry) => entry.jobId))
  const selectedMinutes = selectedEntries.reduce((sum, entry) => sum + entry.minutes + entry.overtimeMinutes, 0)
  const selectedAmount = selectedEntries.reduce((sum, entry) => sum + amountFor(entry), 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const receivedThisMonth = entries.filter((entry) => entry.paid && (entry.paidAt?.slice(0, 7) ?? '') === currentMonth).reduce((sum, entry) => sum + amountFor(entry), 0)
  const dueThisMonth = entries.filter((entry) => !entry.paid && entry.date.startsWith(currentMonth)).reduce((sum, entry) => sum + amountFor(entry), 0)

  const groupedEntries = (() => {
    const groups = new Map<string, Entry[]>()
    unpaidEntries.forEach((entry) => groups.set(entry.jobId, [...(groups.get(entry.jobId) ?? []), entry]))
    return [...groups.entries()].sort(([, first], [, second]) => second[0].date.localeCompare(first[0].date))
  })()

  const toggleEntry = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleJob = (jobEntries: Entry[]) => {
    const ids = jobEntries.map((entry) => entry.id)
    const allSelected = ids.every((id) => selectedIds.includes(id))
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])])
  }

  const selectAll = () => {
    setSelectedIds((current) => selectedEntries.length === unpaidEntries.length ? [] : [...new Set([...current, ...unpaidEntries.map((entry) => entry.id)])])
  }

  const confirmPayment = async () => {
    await onMarkEntriesPaid(selectedEntries.map((entry) => entry.id), paymentDate, paymentMethod || null, paymentNote.trim() || null)
    setSelectedIds([])
    setPaymentMethod('')
    setPaymentNote('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setShowPaymentDetails(false)
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-sm text-muted-foreground">Incassi</p>
        <h2 className="text-2xl font-black">Conferma pagamenti</h2>
        <p className="mt-1 text-xs text-muted-foreground">Scegli cosa hai ricevuto e controlla il riepilogo prima di confermare.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ricevuto questo mese</p><p className="mt-2 text-2xl font-black text-success">{formatCurrency(receivedThisMonth)}</p><p className="mt-1 text-[11px] text-muted-foreground">Pagamenti confermati</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Da ricevere questo mese</p><p className="mt-2 text-2xl font-black text-primary">{formatCurrency(dueThisMonth)}</p><p className="mt-1 text-[11px] text-muted-foreground">In base alle ore registrate</p></CardContent></Card>
      </div>

      <Card className="border-primary/40">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/30 bg-card p-2 text-primary"><WalletCards className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stai confermando</p>
              <p className="mt-1 text-3xl font-black text-primary">{formatCurrency(selectedAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {selectedJobIds.size} {selectedJobIds.size === 1 ? 'lavoro' : 'lavori'} · {formatDuration(selectedMinutes)} · {selectedEntries.length} {selectedEntries.length === 1 ? 'voce' : 'voci'}
              </p>
            </div>
          </div>
          <Button className="w-full" disabled={selectedEntries.length === 0} onClick={() => void confirmPayment()}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Conferma come pagato
          </Button>
          <button type="button" onClick={() => setShowPaymentDetails((value) => !value)} className="mx-auto block text-xs font-semibold text-primary">
            {showPaymentDetails ? 'Nascondi dettagli facoltativi' : 'Aggiungi dettagli facoltativi'}
          </button>
          {showPaymentDetails && <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <label className="block text-xs text-muted-foreground">Data pagamento
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="select-modern mt-1" />
            </label>
            <label className="block text-xs text-muted-foreground">Metodo di pagamento
              <Select value={paymentMethod} onChange={setPaymentMethod} className="mt-1" options={[{ value: '', label: 'Non specificato' }, { value: 'bonifico', label: 'Bonifico bancario' }, { value: 'contanti', label: 'Contanti' }, { value: 'carta', label: 'Carta' }, { value: 'paypal', label: 'PayPal' }, { value: 'altro', label: 'Altro' }]} />
            </label>
            <label className="block text-xs text-muted-foreground">Nota o riferimento (facoltativo)
              <input type="text" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Es. ricevuta, CRO, nota cliente" className="select-modern mt-1" maxLength={120} />
            </label>
          </div>}
          <p className="text-center text-[11px] text-muted-foreground">Puoi modificare la selezione qui sotto prima della conferma.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><p className="text-sm font-bold">Periodo</p></div>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
            {([['last30', '30 giorni'], ['month', 'Mese'], ['quarter', 'Trim.'], ['custom', 'Date']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setPeriod(value); setOffset(0) }} className={`rounded-lg px-1 py-2 text-[11px] font-semibold ${period === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          {period === 'custom' ? (
            <div className="flex gap-2">
              <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Data iniziale" />
              <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Data finale" />
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button type="button" onClick={() => setOffset((value) => value - 1)} aria-label="Periodo precedente">←</button>
              <span>{formatDateItalian(startDate)} – {formatDateItalian(endDate)}</span>
              <button type="button" onClick={() => setOffset((value) => value + 1)} aria-label="Periodo successivo">→</button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Da pagare</p><p className="text-sm text-muted-foreground">{unpaidEntries.length} voci nel periodo</p></div>
          <button type="button" onClick={selectAll} className="text-xs font-semibold text-primary">{selectedEntries.length === unpaidEntries.length && unpaidEntries.length > 0 ? 'Deseleziona' : 'Seleziona tutte'}</button>
          </div>
          {groupedEntries.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nessun pagamento da confermare nel periodo.</p> : (
            <div className="space-y-3">
              {groupedEntries.map(([jobId, jobEntries]) => {
                const job = getJob(jobId)
                const jobSelected = jobEntries.filter((entry) => selectedIds.includes(entry.id))
                return (
                  <div key={jobId} className="rounded-xl border border-border">
                    <div className="flex w-full items-center gap-3 p-3 text-left">
                      <input type="checkbox" checked={jobSelected.length === jobEntries.length} onChange={() => toggleJob(jobEntries)} className="h-4 w-4 accent-primary" aria-label={`Seleziona ${job?.name ?? 'lavoro'}`} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{job?.name ?? 'Lavoro'}</span><span className="block text-xs text-muted-foreground">{job?.client || 'Nessun cliente'} · {jobSelected.length}/{jobEntries.length} selezionate</span></span>
                      <span className="text-sm font-bold">{formatCurrency(jobEntries.reduce((sum, entry) => sum + amountFor(entry), 0))}</span>
                    </div>
                    <div className="border-t border-border px-3">
                      {jobEntries.map((entry) => (
                        <label key={entry.id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
                          <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => toggleEntry(entry.id)} className="h-4 w-4 accent-primary" />
                          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{formatDateItalian(entry.date)} · {entry.start}–{entry.end}</span><span className="text-[11px] text-muted-foreground">{formatDuration(entry.minutes + entry.overtimeMinutes)}</span></span>
                          <span className="text-xs font-bold">{formatCurrency(amountFor(entry))}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {paidEntries.length > 0 && <Card>
        <CardContent className="p-4">
          <button type="button" onClick={() => setShowPaid((value) => !value)} className="flex w-full items-center justify-between text-sm font-bold">
            <span>Già pagati ({paidEntries.length})</span><ChevronDown className={`h-4 w-4 transition-transform ${showPaid ? 'rotate-180' : ''}`} />
          </button>
          {showPaid && <div className="mt-3 divide-y divide-border border-t border-border pt-3">{paidEntries.map(renderPaidEntry)}</div>}
        </CardContent>
      </Card>}

      <Button variant="outline" className="w-full" onClick={() => setShowStatement(true)}>
        <ReceiptText className="mr-2 h-4 w-4" /> Apri estratto conto
      </Button>
    </div>
  )
}
