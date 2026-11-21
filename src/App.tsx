import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthView } from '@/components/auth/AuthView'
import { BottomNav, type TabType } from '@/components/layout/BottomNav'
import { RegisterView } from '@/components/register/RegisterView'
import { JobsView } from '@/components/jobs/JobsView'
import { MessageView } from '@/components/message/MessageView'
import { ProfileView } from '@/components/profile/ProfileView'
import { PaymentsView } from '@/components/payments/PaymentsView'
import { Wifi, WifiOff } from 'lucide-react'
import { db } from '@/db'
import { pendingMutationsCount, queueMutation, syncPendingMutations } from '@/lib/offline-sync'
import { getDefaultJobColor } from '@/lib/job-colors'

const ReportView = lazy(() =>
  import('@/components/report/ReportView').then((module) => ({ default: module.ReportView })),
)

export type Theme = 'dark' | 'light'

const tabIds: TabType[] = ['reg', 'rep', 'payments', 'jobs', 'msg', 'profile']

const getStoredTab = (): TabType => {
  const storedTab = localStorage.getItem('workflow-current-tab')
  return tabIds.includes(storedTab as TabType) ? (storedTab as TabType) : 'reg'
}

function AppLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-5" role="status" aria-label="Caricamento WorkFlow">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-[28px] bg-primary/15" />
          <img
            src="/workflow-logo.svg"
            alt="WorkFlow"
            className="relative h-24 w-24 rounded-[28px] shadow-[0_18px_50px_rgba(64,168,200,0.22)]"
          />
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.24s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.12s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </main>
  )
}

interface Job {
  id: string
  name: string
  client: string
  rate: number
  overtimeEnabled: boolean
  overtimeMultiplier: number
  color: string
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
  note: string
}

interface RemoteJob {
  id: string
  name: string
  client: string | null
  rate: number
  overtime_enabled: boolean
  overtime_multiplier: number
  color: string | null
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
  note: string | null
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
  const [authLoading, setAuthLoading] = useState(true)
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('workflow-theme') === 'light' ? 'light' : 'dark')
  const [currentTab, setCurrentTab] = useState<TabType>(getStoredTab)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [jobs, setJobs] = useState<Job[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [trashEntries, setTrashEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const displayName = session?.user.user_metadata?.display_name
    || localStorage.getItem('workflow-display-name')
    || session?.user.email?.split('@')[0]
    || 'utente'

  const refreshPendingCount = async () => {
    setPendingSyncCount(await pendingMutationsCount())
  }

  const updateDisplayName = async (nextName: string) => {
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: nextName } })
    if (error) {
      toast.error(error.message)
      return
    }
    localStorage.setItem('workflow-display-name', nextName)
    if (data.user) setSession((current) => current ? { ...current, user: data.user } : current)
    toast.success('Nome aggiornato')
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password aggiornata')
  }

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Controlla entrambe le email per confermare la modifica')
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    void refreshPendingCount()
    if (navigator.onLine) {
      void syncPendingMutations().then((synced) => {
        if (synced > 0) toast.success(`${synced} modifiche sincronizzate`)
        void refreshPendingCount()
      })
    }
  }, [])

  const changeTab = (tab: TabType) => {
    setCurrentTab(tab)
    localStorage.setItem('workflow-current-tab', tab)
  }

  useEffect(() => {
    const online = () => {
      setIsOnline(true)
      void syncPendingMutations().then((synced) => {
        if (synced > 0) toast.success(`${synced} modifiche sincronizzate`)
        void refreshPendingCount()
        void loadData()
      })
    }
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
    if (!navigator.onLine) {
      const [localJobs, localPresets, localEntries] = await Promise.all([
        db.jobs.toArray(),
        db.presets.toArray(),
        db.entries.toArray(),
      ])
      setJobs(localJobs.map((job) => ({
        id: job.id,
        name: job.name,
        client: job.client,
        rate: job.rate,
        overtimeEnabled: job.overtimeEnabled,
        overtimeMultiplier: job.overtimeMultiplier,
        color: job.color,
        presets: localPresets.filter((preset) => preset.jobId === job.id).map((preset) => ({ id: preset.id, start: preset.startTime, end: preset.endTime })),
      })))
      const mappedLocalEntries = localEntries.map((entry) => ({
        id: entry.id,
        jobId: entry.jobId,
        date: entry.date,
        start: entry.startTime,
        end: entry.endTime,
        minutes: entry.minutes,
        rate: entry.rate,
        paid: entry.paid,
        paidAt: entry.paidAt,
        paymentMethod: entry.paymentMethod,
        paymentNote: entry.paymentNote,
        breakMinutes: entry.breakMinutes,
        overtimeMinutes: entry.overtimeMinutes,
        overtimeRate: entry.overtimeRate,
        deletedAt: entry.deletedAt,
        note: entry.note,
      }))
      setEntries(mappedLocalEntries.filter((entry) => !entry.deletedAt))
      setTrashEntries(mappedLocalEntries.filter((entry) => entry.deletedAt))
      setLoading(false)
      return
    }
    const expiry = new Date()
    expiry.setDate(expiry.getDate() - 30)
    const cleanupResult = await supabase.from('entries').delete().lt('deleted_at', expiry.toISOString())
    if (cleanupResult.error && !isMissingColumnError(cleanupResult.error.message, 'deleted_at')) {
      toast.error(cleanupResult.error.message)
    }
    const [jobsWithOvertime, presetsResult, entriesWithFeatures] = await Promise.all([
      supabase.from('jobs').select('id,name,client,rate,overtime_enabled,overtime_multiplier,color').order('name'),
      supabase.from('presets').select('id,job_id,start_time,end_time'),
      supabase.from('entries').select('id,job_id,date,start_time,end_time,minutes,rate,break_minutes,overtime_minutes,overtime_rate,paid,paid_at,payment_method,payment_note,deleted_at,note').order('date', { ascending: false }),
    ])
    let jobsData = (jobsWithOvertime.data ?? []) as RemoteJob[]
    let jobsError = jobsWithOvertime.error
    if (jobsWithOvertime.error?.message.includes('overtime_enabled')) {
      const fallbackJobs = await supabase.from('jobs').select('id,name,client,rate,color').order('name')
      jobsData = (fallbackJobs.data ?? []) as RemoteJob[]
      jobsError = fallbackJobs.error
    }
    if (jobsError?.message.includes('color')) {
      const fallbackJobs = await supabase.from('jobs').select('id,name,client,rate,overtime_enabled,overtime_multiplier').order('name')
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
      isMissingColumnError(entriesWithFeatures.error?.message, 'payment_note') ||
      isMissingColumnError(entriesWithFeatures.error?.message, 'note')
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
      color: job.color ?? getDefaultJobColor(remoteJobs.indexOf(job)),
      presets: remotePresets.filter((preset) => preset.job_id === job.id).map((preset) => ({ id: preset.id, start: preset.start_time.slice(0, 5), end: preset.end_time.slice(0, 5) })),
    })))
    const mappedEntries = entriesData.map((entry) => ({
      id: entry.id, jobId: entry.job_id, date: entry.date, start: entry.start_time.slice(0, 5), end: entry.end_time.slice(0, 5),
      minutes: entry.minutes, rate: Number(entry.rate), paid: entry.paid, paidAt: entry.paid_at ?? null, paymentMethod: entry.payment_method ?? null, paymentNote: entry.payment_note ?? null, breakMinutes: entry.break_minutes ?? 0,
      overtimeMinutes: entry.overtime_minutes ?? 0, overtimeRate: Number(entry.overtime_rate ?? 0), deletedAt: entry.deleted_at, note: entry.note ?? '',
    }))
    setEntries(mappedEntries.filter((entry) => !entry.deletedAt))
    setTrashEntries(mappedEntries.filter((entry) => entry.deletedAt))
    await db.transaction('rw', db.jobs, db.presets, db.entries, async () => {
      await db.jobs.clear()
      await db.jobs.bulkPut(remoteJobs.map((job, index) => ({
        id: job.id,
        name: job.name,
        client: job.client ?? '',
        rate: Number(job.rate),
        overtimeEnabled: job.overtime_enabled ?? false,
        overtimeMultiplier: Number(job.overtime_multiplier ?? 1.5),
        color: job.color ?? getDefaultJobColor(index),
        synced: true,
        updatedAt: new Date().toISOString(),
      })))
      await db.presets.clear()
      await db.presets.bulkPut(remotePresets.map((preset) => ({
        id: preset.id,
        jobId: preset.job_id,
        startTime: preset.start_time.slice(0, 5),
        endTime: preset.end_time.slice(0, 5),
        synced: true,
      })))
      await db.entries.clear()
      await db.entries.bulkPut(mappedEntries.map((entry) => ({
        id: entry.id,
        jobId: entry.jobId,
        date: entry.date,
        startTime: entry.start,
        endTime: entry.end,
        minutes: entry.minutes,
        rate: entry.rate,
        paid: entry.paid,
        paidAt: entry.paidAt,
        paymentMethod: entry.paymentMethod,
        paymentNote: entry.paymentNote,
        breakMinutes: entry.breakMinutes,
        overtimeMinutes: entry.overtimeMinutes,
        overtimeRate: entry.overtimeRate,
        deletedAt: entry.deletedAt,
        note: entry.note,
        synced: true,
        updatedAt: new Date().toISOString(),
      })))
    })
    await refreshPendingCount()
    setLoading(false)
  }, [session])

  // Loading remote data is the synchronization boundary for the authenticated session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData() }, [loadData])

  const syncNow = async () => {
    if (!navigator.onLine) {
      toast.info('Torni online per sincronizzare le modifiche')
      return
    }
    const synced = await syncPendingMutations()
    await refreshPendingCount()
    await loadData()
    if (synced > 0) toast.success(`${synced} modifiche sincronizzate`)
  }

  if (authLoading) return <AppLoading />
  const isPasswordRecovery = window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('recovery') === '1'
  if (isPasswordRecovery) return <AuthView recovery />
  if (!session) return <AuthView />

  const createJob = async (name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number, color?: string) => {
    const jobColor = color || getDefaultJobColor(jobs.length)
    if (!navigator.onLine) {
      const id = crypto.randomUUID()
      await db.jobs.put({
        id, name, client, rate, overtimeEnabled, overtimeMultiplier,
        color: jobColor, synced: false, updatedAt: new Date().toISOString(),
      })
      await queueMutation('createJob', { id, user_id: session.user.id, name, client: client || null, rate, overtime_enabled: overtimeEnabled, overtime_multiplier: overtimeMultiplier, color: jobColor })
      await loadData()
      await refreshPendingCount()
      toast.success('Lavoro salvato offline')
      return
    }
    let { error } = await supabase.from('jobs').insert({ user_id: session.user.id, name, client: client || null, rate, overtime_enabled: overtimeEnabled, overtime_multiplier: overtimeMultiplier, color: jobColor })
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

  const updateJob = async (id: string, name: string, client: string, rate: number, overtimeEnabled: boolean, overtimeMultiplier: number, applyToEntries: boolean, color: string) => {
    if (!navigator.onLine) {
      const localJob = await db.jobs.get(id)
      if (localJob) await db.jobs.put({ ...localJob, name, client, rate, overtimeEnabled, overtimeMultiplier, color, synced: false, updatedAt: new Date().toISOString() })
      if (applyToEntries) {
        await db.entries.where('jobId').equals(id).modify((entry) => {
          entry.rate = rate
          entry.overtimeRate = overtimeEnabled ? rate * overtimeMultiplier : rate
          entry.synced = false
          entry.updatedAt = new Date().toISOString()
        })
      }
      await queueMutation('updateJob', { id, values: { name, client: client || null, rate, overtime_enabled: overtimeEnabled, overtime_multiplier: overtimeMultiplier, color } })
      if (applyToEntries) {
        await queueMutation('updateEntry', { id: '__apply_job_entries__', values: { rate, overtime_rate: overtimeEnabled ? rate * overtimeMultiplier : rate }, jobId: id, applyToJobEntries: true })
      }
      await loadData()
      await refreshPendingCount()
      toast.success('Lavoro aggiornato offline')
      return
    }
    const { error } = await supabase.from('jobs').update({
      name,
      client: client || null,
      rate,
      overtime_enabled: overtimeEnabled,
      overtime_multiplier: overtimeMultiplier,
      color,
    }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    if (applyToEntries) {
      const { error: entriesError } = await supabase.from('entries').update({
        rate,
        overtime_rate: overtimeEnabled ? rate * overtimeMultiplier : rate,
      }).eq('job_id', id)
      if (entriesError) {
        toast.error(entriesError.message)
        return
      }
    }
    toast.success(applyToEntries ? 'Lavoro e registrazioni aggiornati' : 'Lavoro aggiornato')
    await loadData()
  }

  const deleteJob = async (id: string) => {
    if (!navigator.onLine) {
      await db.jobs.delete(id)
      await db.presets.where('jobId').equals(id).delete()
      await queueMutation('deleteJob', { id })
      await loadData()
      await refreshPendingCount()
      return
    }
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) {
      toast.error('Non puoi eliminare un lavoro con registrazioni collegate.')
      return
    }
    toast.success('Lavoro eliminato')
    await loadData()
  }

  const addPreset = async (jobId: string, start: string, end: string) => {
    if (!navigator.onLine) {
      const id = crypto.randomUUID()
      await db.presets.put({ id, jobId, startTime: start, endTime: end, synced: false })
      await queueMutation('addPreset', { id, job_id: jobId, user_id: session.user.id, start_time: start, end_time: end })
      await loadData()
      await refreshPendingCount()
      return
    }
    const { error } = await supabase.from('presets').insert({ job_id: jobId, user_id: session.user.id, start_time: start, end_time: end })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Preset aggiunto')
    await loadData()
  }

  const deletePreset = async (id: string) => {
    if (!navigator.onLine) {
      await db.presets.delete(id)
      await queueMutation('deletePreset', { id })
      await loadData()
      await refreshPendingCount()
      return
    }
    const { error } = await supabase.from('presets').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Preset rimosso')
    await loadData()
  }

  const addEntry = async (jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number, note: string = '') => {
    const job = jobs.find((item) => item.id === jobId)
    const overtimeRate = job?.overtimeEnabled ? (job.rate * job.overtimeMultiplier) : job?.rate ?? 0
    if (!navigator.onLine) {
      const id = crypto.randomUUID()
      const minutes = Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes)
      await db.entries.put({
        id, jobId, date, startTime: start, endTime: end, minutes, rate: job?.rate ?? 0,
        paid: false, paidAt: null, paymentMethod: null, paymentNote: null,
        breakMinutes, overtimeMinutes, overtimeRate, deletedAt: null, synced: false,
        note: note.trim(),
        updatedAt: new Date().toISOString(),
      })
      await queueMutation('addEntry', {
        id, user_id: session.user.id, job_id: jobId, date, start_time: start, end_time: end,
        minutes, rate: job?.rate ?? 0, break_minutes: breakMinutes, overtime_minutes: overtimeMinutes,
        overtime_rate: overtimeRate, paid: false,
        note: note.trim(),
      })
      await loadData()
      await refreshPendingCount()
      toast.success('Registrazione salvata offline')
      return
    }
    let { error } = await supabase.from('entries').insert({
      user_id: session.user.id, job_id: jobId, date, start_time: start, end_time: end,
      minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes), rate: job?.rate ?? 0,
      break_minutes: breakMinutes, overtime_minutes: overtimeMinutes, overtime_rate: overtimeRate, paid: false,
      note: note.trim(),
    })
    if (error?.message.includes('break_minutes') || error?.message.includes('note')) {
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

  const updateEntry = async (id: string, jobId: string, date: string, start: string, end: string, breakMinutes: number, overtimeMinutes: number, note: string = '') => {
    const job = jobs.find((item) => item.id === jobId)
    if (!navigator.onLine) {
      const localEntry = await db.entries.get(id)
      if (localEntry) await db.entries.put({
        ...localEntry, jobId, date, startTime: start, endTime: end,
        minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes),
        rate: job?.rate ?? 0, breakMinutes, overtimeMinutes,
        overtimeRate: job?.overtimeEnabled ? job.rate * job.overtimeMultiplier : job?.rate ?? 0,
        note: note.trim(),
        synced: false, updatedAt: new Date().toISOString(),
      })
      await queueMutation('updateEntry', {
        id,
        values: {
          job_id: jobId, date, start_time: start, end_time: end,
          minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes),
          rate: job?.rate ?? 0, break_minutes: breakMinutes, overtime_minutes: overtimeMinutes,
          overtime_rate: job?.overtimeEnabled ? job.rate * job.overtimeMultiplier : job?.rate ?? 0,
          note: note.trim(),
        },
      })
      await loadData()
      await refreshPendingCount()
      toast.success('Registrazione aggiornata offline')
      return
    }
    let { error } = await supabase.from('entries').update({
      job_id: jobId, date, start_time: start, end_time: end,
      minutes: Math.max(0, minutesBetween(start, end) - breakMinutes - overtimeMinutes),
      rate: job?.rate ?? 0, break_minutes: breakMinutes, overtime_minutes: overtimeMinutes,
      overtime_rate: job?.overtimeEnabled ? job.rate * job.overtimeMultiplier : job?.rate ?? 0,
      note: note.trim(),
    }).eq('id', id)
    if (error?.message.includes('break_minutes') || error?.message.includes('note')) {
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
    if (!navigator.onLine) {
      const deletedAt = new Date().toISOString()
      await db.entries.update(id, { deletedAt, synced: false, updatedAt: deletedAt })
      await queueMutation('deleteEntry', { id, deleted_at: deletedAt })
      await loadData()
      await refreshPendingCount()
      return
    }
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
    if (!navigator.onLine) {
      await db.entries.update(id, { deletedAt: null, synced: false, updatedAt: new Date().toISOString() })
      await queueMutation('restoreEntry', { id })
      await loadData()
      await refreshPendingCount()
      return
    }
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
    if (!navigator.onLine) {
      await db.entries.delete(id)
      await queueMutation('permanentlyDeleteEntry', { id })
      await loadData()
      await refreshPendingCount()
      return
    }
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
    if (!navigator.onLine) {
      const paidAt = new Date(`${paidDate}T12:00:00`).toISOString()
      await db.entries.bulkUpdate(uniqueIds.map((id) => ({
        key: id,
        changes: { paid: true, paidAt, paymentMethod, paymentNote, synced: false, updatedAt: new Date().toISOString() },
      })))
      await queueMutation('markEntriesPaid', {
        ids: uniqueIds,
        values: { paid: true, paid_at: paidAt, payment_method: paymentMethod, payment_note: paymentNote },
      })
      await loadData()
      await refreshPendingCount()
      toast.success('Pagamento salvato offline')
      return
    }

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

  const updatePayment = async (id: string, paidDate: string, paymentMethod: string | null, paymentNote: string | null) => {
    if (!navigator.onLine) {
      const paidAt = new Date(`${paidDate}T12:00:00`).toISOString()
      await db.entries.update(id, { paidAt, paymentMethod, paymentNote, synced: false, updatedAt: new Date().toISOString() })
      await queueMutation('updatePayment', { id, values: { paid_at: paidAt, payment_method: paymentMethod, payment_note: paymentNote } })
      await loadData()
      await refreshPendingCount()
      return
    }
    const { error } = await supabase.from('entries').update({
      paid_at: new Date(`${paidDate}T12:00:00`).toISOString(),
      payment_method: paymentMethod,
      payment_note: paymentNote,
    }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Dettagli pagamento aggiornati')
    await loadData()
  }

  const cancelPayment = async (id: string) => {
    if (!navigator.onLine) {
      await db.entries.update(id, { paid: false, paidAt: null, paymentMethod: null, paymentNote: null, synced: false, updatedAt: new Date().toISOString() })
      await queueMutation('cancelPayment', { id })
      await loadData()
      await refreshPendingCount()
      return
    }
    const { error } = await supabase.from('entries').update({
      paid: false,
      paid_at: null,
      payment_method: null,
      payment_note: null,
    }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Pagamento annullato: voce nuovamente da ricevere')
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
            {pendingSyncCount > 0 && (
              <button type="button" onClick={() => void syncNow()} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500 transition-colors hover:bg-amber-500/25" title="Sincronizza modifiche ora">
                {pendingSyncCount} da sincronizzare
              </button>
            )}
          </div>
          <button type="button" className="max-w-36 truncate rounded-lg px-2 py-1 text-right text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" onClick={() => changeTab('profile')}>
            Ciao, {displayName}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 p-4">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Caricamento dati">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.24s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.12s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        ) : <>
          {currentTab === 'reg' && <RegisterView jobs={jobs} entries={entries} trashEntries={trashEntries} onAddEntry={addEntry} onUpdateEntry={updateEntry} onDeleteEntry={deleteEntry} onRestoreEntry={restoreEntry} onPermanentlyDeleteEntry={permanentlyDeleteEntry} onCreateJob={createJob} />}
          {currentTab === 'rep' && (
            <Suspense fallback={
              <div className="view-enter flex min-h-48 items-center justify-center" role="status" aria-label="Caricamento report">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.24s]" />
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.12s]" />
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            }>
              <ReportView jobs={jobs} entries={entries} />
            </Suspense>
          )}
          {currentTab === 'payments' && <PaymentsView jobs={jobs} entries={entries} onMarkEntriesPaid={markEntriesPaid} onUpdatePayment={updatePayment} onCancelPayment={cancelPayment} />}
          {currentTab === 'jobs' && <JobsView jobs={jobs} onCreateJob={createJob} onUpdateJob={updateJob} onDeleteJob={deleteJob} onAddPreset={addPreset} onDeletePreset={deletePreset} />}
          {currentTab === 'msg' && <MessageView jobs={jobs} entries={entries} />}
          {currentTab === 'profile' && <ProfileView email={session.user.email ?? 'utente'} displayName={displayName} theme={theme} jobsCount={jobs.length} entriesCount={entries.length} onThemeChange={setTheme} onSignOut={() => void supabase.auth.signOut()} onDisplayNameChange={updateDisplayName} onPasswordChange={updatePassword} onEmailChange={updateEmail} />}
        </>}
      </main>
      <BottomNav currentTab={currentTab} onTabChange={changeTab} />
    </div>
  )
}
