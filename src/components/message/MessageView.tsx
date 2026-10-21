import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateItalian, formatDuration, DAY_NAMES } from '@/lib/utils'
import { Copy, Share2 } from 'lucide-react'
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

interface MessageViewProps {
  jobs: Job[]
  entries: Entry[]
}

const PLACEHOLDERS = ['giorno', 'data', 'ore', 'da', 'a', 'euro', 'tariffa', 'tariffaExtra', 'lavoro', 'cliente']
const normalizeTemplate = (template: string) =>
  template.replace('({ore} h)', '({ore})').replace('Totale: {ore} h', 'Totale: {ore}')

export const MessageView: React.FC<MessageViewProps> = ({ jobs, entries }) => {
  const [rowTemplate, setRowTemplate] = useState(
    normalizeTemplate(localStorage.getItem('tpl_row') || '{giorno} {data}: {da}–{a} ({ore}) → {euro}')
  )
  const [totTemplate, setTotTemplate] = useState(
    normalizeTemplate(localStorage.getItem('tpl_tot') || 'Totale: {ore} = {euro}')
  )

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleRowChange = (val: string) => {
    setRowTemplate(val)
    localStorage.setItem('tpl_row', val)
  }

  const handleTotChange = (val: string) => {
    setTotTemplate(val)
    localStorage.setItem('tpl_tot', val)
  }

  const insertPlaceholder = (ph: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const nextText = rowTemplate.substring(0, start) + `{${ph}}` + rowTemplate.substring(end)
    handleRowChange(nextText)
  }

  const getJob = (id: string) => jobs.find((j) => j.id === id) || { name: '?', client: '', rate: 0 }

  const buildPreview = () => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    const totalMinutes = sorted.reduce((acc, cur) => acc + cur.minutes + cur.overtimeMinutes, 0)
    const totalPay = sorted.reduce((acc, cur) => acc + (cur.minutes / 60) * cur.rate + (cur.overtimeMinutes / 60) * (cur.overtimeRate || cur.rate), 0)

    const lines = sorted.map((e) => {
      const d = new Date(e.date + 'T12:00:00')
      const j = getJob(e.jobId)
      const dayName = DAY_NAMES[d.getDay()]
      const dateFormatted = formatDateItalian(e.date)
      const hours = formatDuration(e.minutes)
      const euro = formatCurrency((e.minutes / 60) * e.rate + (e.overtimeMinutes / 60) * (e.overtimeRate || e.rate))
      const overtime = e.overtimeMinutes ? ` + ${formatDuration(e.overtimeMinutes)} extra` : ''

      return rowTemplate.replace(/\{(\w+)\}/g, (_, k) => {
        const map: Record<string, string> = {
          giorno: dayName,
          data: dateFormatted,
          ore: `${hours}${overtime}`,
          da: e.start,
          a: e.end,
          euro: euro,
          tariffa: `${formatCurrency(e.rate)}/h`,
          tariffaExtra: `${formatCurrency(e.overtimeRate || e.rate)}/h`,
          lavoro: j.name,
          cliente: j.client,
        }
        return map[k] ?? `{${k}}`
      })
    })

    const finalTot = totTemplate
      .replace('{ore}', formatDuration(totalMinutes))
      .replace('{euro}', formatCurrency(totalPay))

    return `${lines.join('\n')}\n\n${finalTot}`
  }

  const messageText = buildPreview()
  const previewLines = messageText.split('\n')
  const previewLimit = 8
  const compactPreview = previewLines.length > previewLimit
    ? `${previewLines.slice(0, previewLimit).join('\n')}\n… e altre ${previewLines.length - previewLimit} righe`
    : messageText

  return (
    <div className="space-y-4 pb-24">
      {/* Configurazione Template */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Formato riga per ogni giorno</label>
            <textarea
              ref={textareaRef}
              rows={2}
              value={rowTemplate}
              onChange={(e) => handleRowChange(e.target.value)}
              className="w-full mt-1.5 p-2.5 bg-background border border-border rounded-xl text-xs font-mono"
            />
          </div>

          {/* Chip Segnaposto */}
          <div className="grid grid-cols-4 gap-1.5 pb-1">
            {PLACEHOLDERS.map((ph) => (
              <button
                key={ph}
                onClick={() => insertPlaceholder(ph)}
                className="rounded-lg border border-border bg-muted/60 px-1.5 py-1.5 text-[10px] font-mono text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                {`{${ph}}`}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Riga totale finale</label>
            <input
              type="text"
              value={totTemplate}
              onChange={(e) => handleTotChange(e.target.value)}
              className="w-full mt-1.5 p-2.5 bg-background border border-border rounded-xl text-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Anteprima Live */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Anteprima in tempo reale</label>
          <pre className="max-h-64 overflow-y-auto rounded-xl border border-border bg-muted/40 p-3 text-xs font-sans leading-relaxed whitespace-pre-wrap">
            {compactPreview}
          </pre>
        </CardContent>
      </Card>

      {/* Pulsanti Condivisione */}
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold flex items-center justify-center gap-2"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(messageText)}`, '_blank')}
        >
          <Share2 className="h-4 w-4" /> Invia su WhatsApp
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(messageText)
            toast.success('Messaggio copiato!')
          }}
          className="px-4"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}