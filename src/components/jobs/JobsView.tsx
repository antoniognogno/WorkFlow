import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Preset {
  id: string
  start: string
  end: string
}

interface Job {
  id: string
  name: string
  client: string
  rate: number
  overtimeEnabled: boolean
  overtimeMultiplier: number
  presets: Preset[]
}

interface JobsViewProps {
  jobs: Job[]
  onCreateJob: (name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number) => Promise<void>
  onUpdateJob: (id: string, name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number, applyToEntries: boolean) => Promise<void>
  onDeleteJob: (id: string) => Promise<void>
  onAddPreset: (jobId: string, start: string, end: string) => Promise<void>
  onDeletePreset: (id: string) => Promise<void>
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, onCreateJob, onUpdateJob, onDeleteJob, onAddPreset, onDeletePreset }) => {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [rate, setRate] = useState('')
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5')

  const [presetStarts, setPresetStarts] = useState<Record<string, string>>({})
  const [presetEnds, setPresetEnds] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { name: string; client: string; rate: string; overtimeEnabled: boolean; overtimeMultiplier: string }>>({})
  const [applyAll, setApplyAll] = useState<Record<string, boolean>>({})
  const [confirmationText, setConfirmationText] = useState<Record<string, string>>({})

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await onCreateJob(name.trim(), client.trim(), parseFloat(rate) || 0, overtimeEnabled, parseFloat(overtimeMultiplier) || 1.5)

    setName('')
    setClient('')
    setRate('')
    setOvertimeEnabled(false)
    toast.success('Lavoro creato!')
  }

  const handleDeleteJob = async (id: string) => {
    await onDeleteJob(id)
    toast.success('Lavoro eliminato')
  }

  const handleAddPreset = async (jobId: string) => {
    const s = presetStarts[jobId] || '16:00'
    const en = presetEnds[jobId] || '18:00'

    await onAddPreset(jobId, s, en)
    toast.success('Preset aggiunto')
  }

  const handleDeletePreset = async (presetId: string) => {
    await onDeletePreset(presetId)
    toast.success('Preset rimosso')
  }

  const beginEdit = (job: Job) => {
    setEditingId(job.id)
    setEditValues((current) => ({ ...current, [job.id]: { name: job.name, client: job.client, rate: String(job.rate), overtimeEnabled: job.overtimeEnabled, overtimeMultiplier: String(job.overtimeMultiplier) } }))
  }

  const saveEdit = async (job: Job) => {
    const values = editValues[job.id]
    if (!values?.name.trim() || (applyAll[job.id] && confirmationText[job.id] !== 'Conferma')) return
    await onUpdateJob(job.id, values.name.trim(), values.client.trim(), Number(values.rate) || 0, values.overtimeEnabled, Number(values.overtimeMultiplier) || 1.5, Boolean(applyAll[job.id]))
    setEditingId(null)
    setConfirmationText((current) => ({ ...current, [job.id]: '' }))
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Lista Lavori */}
      {jobs.map((j) => (
        <Card key={j.id}>
          <CardContent className="p-4 space-y-3">
            {editingId === j.id ? <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Nome del lavoro<Input className="mt-1" value={editValues[j.id]?.name ?? j.name} onChange={(event) => setEditValues((current) => ({ ...current, [j.id]: { ...current[j.id], name: event.target.value } }))} aria-label="Nome del lavoro" /></label>
              <p className="-mt-2 text-[11px] text-muted-foreground">Il nome identifica l’attività nei registri, nei report e nei pagamenti.</p>
              <label className="block text-xs font-semibold text-muted-foreground">Cliente<Input className="mt-1" value={editValues[j.id]?.client ?? j.client} onChange={(event) => setEditValues((current) => ({ ...current, [j.id]: { ...current[j.id], client: event.target.value } }))} placeholder="Nome del cliente" aria-label="Cliente" /></label>
              <p className="-mt-2 text-[11px] text-muted-foreground">Il cliente viene mostrato insieme al lavoro per distinguere i committenti.</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-muted-foreground">Tariffa normale<Input className="mt-1" type="number" min="0" step="0.5" value={editValues[j.id]?.rate ?? j.rate} onChange={(event) => setEditValues((current) => ({ ...current, [j.id]: { ...current[j.id], rate: event.target.value } }))} aria-label="Tariffa normale in euro all'ora" /></label>
                <label className="block text-xs font-semibold text-muted-foreground">Moltiplicatore extra<Input className="mt-1" type="number" min="1" step="0.1" value={editValues[j.id]?.overtimeMultiplier ?? j.overtimeMultiplier} onChange={(event) => setEditValues((current) => ({ ...current, [j.id]: { ...current[j.id], overtimeMultiplier: event.target.value } }))} aria-label="Moltiplicatore degli straordinari" /></label>
              </div>
              <p className="-mt-2 text-[11px] text-muted-foreground">La tariffa normale è l’importo orario base. Il moltiplicatore determina quanto vale un’ora straordinaria, se attivata.</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={editValues[j.id]?.overtimeEnabled ?? j.overtimeEnabled} onChange={(event) => setEditValues((current) => ({ ...current, [j.id]: { ...current[j.id], overtimeEnabled: event.target.checked } }))} /> Attiva tariffa straordinari</label>
              <p className="-mt-2 text-[11px] text-muted-foreground">Se attivo, i minuti indicati come straordinari vengono calcolati con la tariffa base moltiplicata.</p>
              <p className="text-xs text-muted-foreground">Se cambi cliente, conviene creare un nuovo lavoro per mantenere separata la cronologia.</p>
              <label className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs"><input type="checkbox" checked={Boolean(applyAll[j.id])} onChange={(event) => setApplyAll((current) => ({ ...current, [j.id]: event.target.checked }))} /> Applica tariffa e straordinari a tutte le registrazioni passate</label>
              {applyAll[j.id] && <div className="space-y-2 rounded-lg border border-destructive/60 bg-destructive/10 p-3"><p className="text-xs font-semibold text-destructive">Azione pericolosa: modifica i compensi già registrati.</p><Input value={confirmationText[j.id] ?? ''} onChange={(event) => setConfirmationText((current) => ({ ...current, [j.id]: event.target.value }))} placeholder="Scrivi Conferma" aria-label="Conferma applicazione storica" /><p className="text-[11px] text-muted-foreground">Digita esattamente <strong>Conferma</strong> per abilitare il salvataggio.</p></div>}
              <div className="flex gap-2"><Button size="sm" onClick={() => void saveEdit(j)} disabled={Boolean(applyAll[j.id]) && confirmationText[j.id] !== 'Conferma'}><Check className="mr-1 h-4 w-4" /> Salva</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annulla</Button></div>
            </div> : <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base">{j.name}</h3>
                <p className="text-xs text-muted-foreground">{j.client || 'Nessun cliente'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-success text-sm">{formatCurrency(j.rate)}/h</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => beginEdit(j)} aria-label={`Modifica ${j.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteJob(j.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>}

            {/* Chip Preset */}
            <div className="flex flex-wrap gap-1.5">
              {j.presets.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {p.start}–{p.end}
                  <button type="button" aria-label={`Rimuovi preset ${p.start}–${p.end}`} onClick={() => handleDeletePreset(p.id)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Aggiunta Rapida Preset */}
            <div className="flex gap-2 items-center pt-1">
              <Input
                type="time"
                inputMode="numeric"
                value={presetStarts[j.id] || '16:00'}
                onChange={(e) => setPresetStarts({ ...presetStarts, [j.id]: e.target.value })}
                className="h-8 text-xs px-2"
              />
              <Input
                type="time"
                inputMode="numeric"
                value={presetEnds[j.id] || '18:00'}
                onChange={(e) => setPresetEnds({ ...presetEnds, [j.id]: e.target.value })}
                className="h-8 text-xs px-2"
              />
              <Button size="sm" className="h-8 bg-primary/20 text-foreground text-xs font-semibold hover:bg-primary/30" onClick={() => handleAddPreset(j.id)}>
                + Preset
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Creazione Nuovo Lavoro */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-bold text-sm mb-3">Nuovo lavoro</h4>
          <form onSubmit={handleCreateJob} className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Nome (es. Ripetizioni)" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Cliente" value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
              <input type="checkbox" checked={overtimeEnabled} onChange={(e) => setOvertimeEnabled(e.target.checked)} />
              Straordinari pagati di più
              {overtimeEnabled && (
                <Input className="ml-auto h-9 w-20 text-xs" inputMode="decimal" type="number" min="1" step="0.1" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(e.target.value)} aria-label="Moltiplicatore straordinari" />
              )}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="Tariffa €/ora"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
              <Button type="submit" className="font-bold shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Crea
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}