import { useCallback, useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthView } from '@/components/auth/AuthView'
import { BottomNav, type TabType } from '@/components/layout/BottomNav'
import { RegisterView } from '@/components/register/RegisterView'
import { ReportView } from '@/components/report/ReportView'
import { JobsView } from '@/components/jobs/JobsView'
import { MessageView } from '@/components/message/MessageView'
import { ProfileView } from '@/components/profile/ProfileView'
import { PaymentsView } from '@/components/payments/PaymentsView'
import { Wifi, WifiOff } from 'lucide-react'

export type Theme = 'dark' | 'light'

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
  paidAt: string | null
  paymentMethod: string | null
  paymentNote: string | null
  breakMinutes: number
  overtimeMinutes: number
  overtimeRate: number
  deletedAt: string | null
}

interface RemoteJob {
  id: string
  name: string
  client: string | null
  rate: number
  overtime_enabled: boolean
  overtime_multiplier: number
}

interface RemotePreset {
  id: string
  job_id: string
  start_time: string
  end_time: string
}

interface RemoteEntry {
  id: string
  job_id: string
  date: string
  start_time: string
  end_time: string
  minutes: number
  rate: number
  paid: boolean
  paid_at: string | null
  payment_method: string | null
  payment_note: string | null
  break_minutes: number
  overtime_minutes: number
  overtime_rate: number
  deleted_at: string | null
}

const minutesBetween = (start: string, end: string) => {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const result = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return result < 0 ? result + 1440 : result
}

const isMissingColumnError = (message: string | undefined, column: string) =>
  Boolean(message?.includes(column) && (message.includes('schema cache') || message.includes('does not exist')))

export default function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null)
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('workflow-theme') === 'light' ? 'light' : 'dark')
  const [currentTab, setCurrentTab] = useState<TabType>('reg')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [jobs, setJobs] = useState<Job[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [trashEntries, setTrashEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('workflow-theme', theme)
  }, [theme])

  const loadData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const expiry = new Date()
    expiry.setDate(expiry.getDate() - 30)
    const cleanupResult = await supabase.from('entries').delete().lt('deleted_at', expiry.toISOString())
    if (cleanupResult.error && !isMissingColumnError(cleanupResult.error.message, 'deleted_at')) {
      toast.error(cleanupResult.error.message)
    }
    const [jobsWithOvertime, presetsResult, entriesWithFeatures] = await Promise.all([
      supabase.from('jobs').select('id,name,client,rate,overtime_enabled,overtime_multiplier').order('name'),
      supabase.from('presets').select('id,job_id,start_time,end_time'),
      supabase.from('entries').select('id,job_id,date,start_time,end_time,minutes,rate,break_minutes,overtime_minutes,overtime_rate,paid,paid_at,payment_method,payment_note,deleted_at').order('date', { ascending: false }),
    ])
    let jobsData = (jobsWithOvertime.data ?? []) as RemoteJob[]
    let jobsError = jobsWithOvertime.error
    if (jobsWithOvertime.error?.message.includes('overtime_enabled')) {
      const fallbackJobs = await supabase.from('jobs').select('id,name,client,rate').order('name')
      jobsData = (fallbackJobs.data ?? []) as RemoteJob[]
      jobsError = fallbackJobs.error
    }
    let entriesData = (entriesWithFeatures.data ?? []) as RemoteEntry[]
    let entriesError = entriesWithFeatures.error
    if (
      isMissingColumnError(entriesWithFeatures.error?.message, 'break_minutes') ||
      isMissingColumnError(entriesWithFeatures.error?.message, 'deleted_at') ||
      isMissingColumnError(entriesWithFeatures.error?.message, 'paid_at') ||
      isMissingColumnError(entriesWithFeatures.error?.message, 'payment_method') ||
      isMissingColumnError(entriesWithFeatures.error?.message, 'payment_note')
    ) {
      const fallbackEntries = await supabase.from('entries').select('id,job_id,date,start_time,end_time,minutes,rate,paid').order('date', { ascending: false })
      entriesData = (fallbackEntries.data ?? []) as RemoteEntry[]
      entriesError = fallbackEntries.error
    }
    const error = jobsError || presetsResult.error || entriesError
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const remoteJobs = jobsData
    const remotePresets = (presetsResult.data ?? []) as RemotePreset[]
    setJobs(remoteJobs.map((job) => ({
      id: job.id,
      name: job.name,
      client: job.client ?? '',
      rate: Number(job.rate),
      overtimeEnabled: job.overtime_enabled ?? false,
      overtimeMultiplier: Number(job.overtime_multiplier ?? 1.5),
      presets: remotePresets.filter((preset) => preset.job_id === job.id).map((preset) => ({ id: preset.id, start: preset.start_time.slice(0, 5), end: preset.end_time.slice(0, 5) })),
    })))
    const mappedEntries = entriesData.map((entry) => ({
      id: entry.id, jobId: entry.job_id, date: entry.date, start: entry.start_time.slice(0, 5), end: entry.end_time.slice(0, 5),
      minutes: entry.minutes, rate: Number(entry.rate), paid: entry.paid, paidAt: entry.paid_at ?? null, paymentMethod: entry.payment_method ?? null, paymentNote: entry.payment_note ?? null, breakMinutes: entry.break_minutes ?? 0,
      overtimeMinutes: entry.overtime_minutes ?? 0, overtimeRate: Number(entry.overtime_rate ?? 0), deletedAt: entry.deleted_at,
    }))
    setEntries(mappedEntries.filter((entry) => !entry.deletedAt))
    setTrashEntries(mappedEntries.filter((entry) => entry.deletedAt))
    setLoading(false)
  }, [session])

  // Loading remote data is the synchronization boundary for the authenticated session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData() }, [loadData])

  if (!session) return <AuthView />

  const createJob = async (name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number) => {
    let { error } = await supabase.from('jobs').insert({ user_id: session.user.id, name, client: client || null, rate, overtime_enabled: overtimeEnabled, overtime_multiplier: overtimeMultiplier })
    if (error?.message.includes('overtime_enabled')) {
      const fallback = await supabase.from('jobs').insert({ user_id: session.user.id, name, client: client || null, rate })
      error = fallback.error
    }
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Lavoro creato!')
    await loadData()
  }

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) {
      toast.error('Non puoi eliminare un lavoro con registrazioni collegate.')
      return
    }
    toast.success('Lavoro eliminato')
    await loadData()
  }

  const addPreset = async (jobId: string, start: string, end: string) => {
    const { error } = await supabase.from('presets').insert({ job_id: jobId, user_id: session.user.id, start_time: start, end_time: end })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Preset aggiunto')
    await loadData()
  }

  const deletePreset = async (id: string) => {
    const { error } = await supabase.from('presets').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Preset rimosso')
    await loadData()
  }

  const addEntry = async (jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number) => {
    const job = jobs.find((item) => item.id === jobId)
    const overtimeRate = job?.overtimeEnabled ? (job.rate * job.overtimeMultiplier) : job?.rate ?? 0
    let { error } = await supabase.from('entries').insert({
      user_id: session.user.id, job_id: jobId, date, start_time: start, end_time: end,
      minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes), rate: job?.rate ?? 0,
      break_minutes: breakMinutes, overtime_minutes: overtimeMinutes, overtime_rate: overtimeRate, paid: false,
    })
    if (error?.message.includes('break_minutes')) {
      const fallback = await supabase.from('entries').insert({
        user_id: session.user.id, job_id: jobId, date, start_time: start, end_time: end,
        minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes), rate: job?.rate ?? 0, paid: false,
      })
      error = fallback.error
    }
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Ore registrate')
    await loadData()
  }

  const updateEntry = async (id: string, jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number) => {
    const job = jobs.find((item) => item.id === jobId)
    let { error } = await supabase.from('entries').update({
      job_id: jobId, date, start_time: start, end_time: end,
      minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes),
      rate: job?.rate ?? 0, break_minutes: breakMinutes, overtime_minutes: overtimeMinutes,
      overtime_rate: job?.overtimeEnabled ? job.rate * job.overtimeMultiplier : job?.rate ?? 0,
    }).eq('id', id)
    if (error?.message.includes('break_minutes')) {
      const fallback = await supabase.from('entries').update({
        job_id: jobId, date, start_time: start, end_time: end,
        minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes),
        rate: job?.rate ?? 0,
      }).eq('id', id)
      error = fallback.error
    }
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Registrazione aggiornata')
    await loadData()
  }

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (isMissingColumnError(error.message, 'deleted_at')) {
        toast.error('Il cestino non è ancora attivo. Esegui supabase/migration-entries-features.sql nel SQL Editor di Supabase, poi ricarica l’app.')
        return
      }
      toast.error(error.message)
      return
    }
    await loadData()
  }

  const restoreEntry = async (id: string) => {
    const { error } = await supabase.from('entries').update({ deleted_at: null }).eq('id', id)
    if (error) {
      if (isMissingColumnError(error.message, 'deleted_at')) {
        toast.error('Il cestino non è ancora attivo. Esegui supabase/migration-entries-features.sql nel SQL Editor di Supabase, poi ricarica l’app.')
        return
      }
      toast.error(error.message)
      return
    }
    toast.success('Registrazione recuperata')
    await loadData()
  }

  const permanentlyDeleteEntry = async (id: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    await loadData()
  }

  const markEntriesPaid = async (ids: string[], paidDate: string, paymentMethod: string | null, paymentNote: string | null) => {
    const uniqueIds = [...new Set(ids)].filter(Boolean)
    if (uniqueIds.length === 0) return

    const { error } = await supabase
      .from('entries')
      .update({ paid: true, paid_at: new Date(`${paidDate}T12:00:00`).toISOString(), payment_method: paymentMethod, payment_note: paymentNote })
      .in('id', uniqueIds)

    if (error) {
      if (isMissingColumnError(error.message, 'paid_at') || isMissingColumnError(error.message, 'payment_method') || isMissingColumnError(error.message, 'payment_note')) {
        toast.error('Dettagli pagamento non disponibili: esegui supabase/migration-payment-details.sql nel SQL Editor di Supabase.')
        return
      }
      toast.error(error.message)
      return
    }

    toast.success(`${uniqueIds.length} ${uniqueIds.length === 1 ? 'registrazione segnata' : 'registrazioni segnate'} come pagate`)
    await loadData()
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">WorkFlow</h1>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button type="button" className="max-w-36 truncate rounded-lg px-2 py-1 text-right text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" onClick={() => setCurrentTab('profile')}>
            Ciao, {session.user.email ?? 'utente'}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 p-4">
        {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Caricamento dati…</p> : <>
          {currentTab === 'reg' && <RegisterView jobs={jobs} entries={entries} trashEntries={trashEntries} onAddEntry={addEntry} onUpdateEntry={updateEntry} onDeleteEntry={deleteEntry} onRestoreEntry={restoreEntry} onPermanentlyDeleteEntry={permanentlyDeleteEntry} onCreateJob={createJob} />}
          {currentTab === 'rep' && <ReportView jobs={jobs} entries={entries} />}
          {currentTab === 'payments' && <PaymentsView jobs={jobs} entries={entries} onMarkEntriesPaid={markEntriesPaid} />}
          {currentTab === 'jobs' && <JobsView jobs={jobs} onCreateJob={createJob} onDeleteJob={deleteJob} onAddPreset={addPreset} onDeletePreset={deletePreset} />}
          {currentTab === 'msg' && <MessageView jobs={jobs} entries={entries} />}
          {currentTab === 'profile' && <ProfileView email={session.user.email ?? 'utente'} theme={theme} jobsCount={jobs.length} entriesCount={entries.length} onThemeChange={setTheme} onSignOut={() => void supabase.auth.signOut()} />}
        </>}
      </main>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  )
}
