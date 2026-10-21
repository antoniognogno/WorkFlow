import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, X } from 'lucide-react'
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
  onDeleteJob: (id: string) => Promise<void>
  onAddPreset: (jobId: string, start: string, end: string) => Promise<void>
  onDeletePreset: (id: string) => Promise<void>
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, onCreateJob, onDeleteJob, onAddPreset, onDeletePreset }) => {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [rate, setRate] = useState('')
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5')

  const [presetStarts, setPresetStarts] = useState<Record<string, string>>({})
  const [presetEnds, setPresetEnds] = useState<Record<string, string>>({})

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

  return (
    <div className="space-y-4 pb-24">
      {/* Lista Lavori */}
      {jobs.map((j) => (
        <Card key={j.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base">{j.name}</h3>
                <p className="text-xs text-muted-foreground">{j.client || 'Nessun cliente'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-success text-sm">{formatCurrency(j.rate)}/h</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteJob(j.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

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
                value={presetStarts[j.id] || '16:00'}
                onChange={(e) => setPresetStarts({ ...presetStarts, [j.id]: e.target.value })}
                className="h-8 text-xs px-2"
              />
              <Input
                type="time"
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
                <Input className="ml-auto h-7 w-20 text-xs" type="number" min="1" step="0.1" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(e.target.value)} aria-label="Moltiplicatore straordinari" />
              )}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
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