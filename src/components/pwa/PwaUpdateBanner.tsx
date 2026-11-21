import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function PwaUpdatesView() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const refresh = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
    })
    setUpdateSW(() => refresh)
  }, [])

  const checkForUpdates = async () => {
    setChecking(true)
    setChecked(false)
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations()
      await Promise.all(registrations?.map((registration) => registration.update()) ?? [])
    } finally {
      window.setTimeout(() => {
        setChecking(false)
        setChecked(true)
      }, 600)
    }
  }

  const update = async () => {
    setUpdating(true)
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'status')
    overlay.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background text-foreground'
    overlay.innerHTML = '<img src="/workflow-logo.svg" alt="WorkFlow" class="h-24 w-24 rounded-[28px] shadow-lg"><p class="text-sm font-semibold">Aggiornamento WorkFlow…</p>'
    document.body.appendChild(overlay)
    await updateSW?.(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              {needRefresh ? <RefreshCw className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-bold">{needRefresh ? 'Aggiornamento disponibile' : checked ? 'WorkFlow è aggiornato' : 'Versione installata'}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {needRefresh ? 'Una nuova versione è pronta da installare.' : 'Puoi controllare manualmente quando vuoi.'}
              </p>
            </div>
          </div>
          <Button className="w-full" onClick={() => needRefresh ? void update() : void checkForUpdates()} disabled={checking || updating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking || updating ? 'animate-spin' : ''}`} />
            {updating ? 'Aggiornamento…' : checking ? 'Controllo…' : needRefresh ? 'Aggiorna ora' : 'Controlla aggiornamenti'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Novità recenti</p>
          </div>
          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>• Attività ed estratto conto con card più moderne e leggibili.</li>
            <li>• Calendario mensile e obiettivi settimanali intelligenti.</li>
            <li>• Dashboard pagamenti con incassi e cliente più redditizio.</li>
            <li>• Note attività, colori lavori e grafici più chiari.</li>
            <li>• Migliore utilizzo offline e sincronizzazione delle modifiche.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
