import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PwaUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const refresh = registerSW({
      immediate: false,
      onNeedRefresh: () => setNeedRefresh(true),
    })
    setUpdateSW(() => refresh)
  }, [])

  const update = async () => {
    setUpdating(true)
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'status')
    overlay.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background text-foreground'
    overlay.innerHTML = '<img src="/workflow-logo.svg" alt="WorkFlow" class="h-24 w-24 rounded-[28px] shadow-lg"><p class="text-sm font-semibold">Aggiornamento WorkFlow…</p>'
    document.body.appendChild(overlay)
    await updateSW?.(true)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-md rounded-2xl border border-primary/35 bg-card p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)] view-enter">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <RefreshCw className={`h-5 w-5 ${updating ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">È disponibile una nuova versione</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Nuovo calendario mensile, obiettivi settimanali, gestione pagamenti migliorata e sincronizzazione più affidabile.
          </p>
        </div>
        <button type="button" onClick={() => setNeedRefresh(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Chiudi aggiornamento">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button className="mt-3 w-full" onClick={() => void update()} disabled={updating}>
        <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
        {updating ? 'Aggiornamento…' : 'Aggiorna ora'}
      </Button>
    </div>
  )
}
