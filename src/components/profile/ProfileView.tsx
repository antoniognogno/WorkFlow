import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { UserRound, LogOut, Mail, Heart, BriefcaseBusiness, ClipboardList, ShieldCheck, Pencil, Check, Eye, EyeOff, KeyRound, ArrowLeft, ChevronRight, Target } from 'lucide-react'
import type { Theme } from '@/App'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { WorkGoals } from '@/lib/goals'

interface GoalJob {
  id: string
  name: string
  client: string
}

interface ProfileViewProps {
  email: string
  displayName: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSignOut: () => void
  onDisplayNameChange: (displayName: string) => Promise<void>
  onPasswordChange: (password: string) => Promise<void>
  goals: WorkGoals
  jobs: GoalJob[]
  onGoalsChange: (goals: WorkGoals) => Promise<void>
  jobsCount: number
  entriesCount: number
}

export function ProfileView({ email, displayName, theme, onThemeChange, onSignOut, onDisplayNameChange, onPasswordChange, goals, jobs, onGoalsChange, jobsCount, entriesCount }: ProfileViewProps) {
  const [name, setName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordView, setPasswordView] = useState(false)
  const [goalsView, setGoalsView] = useState(false)
  const [goalDraft, setGoalDraft] = useState<WorkGoals>(goals)
  const [savingGoals, setSavingGoals] = useState(false)

  const saveName = async () => {
    const nextName = name.trim()
    if (!nextName) return
    setSavingName(true)
    await onDisplayNameChange(nextName)
    setSavingName(false)
    setEditingName(false)
  }

  const savePassword = async () => {
    if (newPassword.length < 6 || newPassword !== confirmPassword) return
    setChangingPassword(true)
    await onPasswordChange(newPassword)
    setNewPassword('')
    setConfirmPassword('')
    setChangingPassword(false)
  }

  const saveGoals = async () => {
    setSavingGoals(true)
    await onGoalsChange({
      monthlyHours: Math.max(0, Number(goalDraft.monthlyHours) || 0),
      monthlyEarnings: Math.max(0, Number(goalDraft.monthlyEarnings) || 0),
      weeklyHours: Math.max(0, Number(goalDraft.weeklyHours) || 0),
      jobMonthlyEarnings: Object.fromEntries(
        Object.entries(goalDraft.jobMonthlyEarnings).map(([id, value]) => [id, Math.max(0, Number(value) || 0)]),
      ),
    })
    setSavingGoals(false)
  }

  if (passwordView) {
    return (
      <div className="view-enter space-y-4 pb-24">
        <button type="button" onClick={() => setPasswordView(false)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Profilo
        </button>
        <div>
          <p className="text-sm text-muted-foreground">Sicurezza account</p>
          <h2 className="text-2xl font-black">Cambia password</h2>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">Scegli una password lunga almeno 6 caratteri. Per sicurezza, la password attuale non viene mostrata o memorizzata nell’app.</p>
            </div>
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="new-password">
              Nuova password
              <div className="relative mt-2">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-12"
                  placeholder="Almeno 6 caratteri"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="confirm-password">
              Conferma nuova password
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                className="mt-2"
                placeholder="Ripeti la password"
              />
            </label>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs font-semibold text-destructive">Le password non coincidono</p>
            )}
            <Button className="w-full" onClick={() => void savePassword()} disabled={changingPassword || newPassword.length < 6 || newPassword !== confirmPassword}>
              <KeyRound className="mr-2 h-4 w-4" /> Aggiorna password
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (goalsView) {
    return (
      <div className="view-enter space-y-4 pb-24">
        <button type="button" onClick={() => setGoalsView(false)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Profilo
        </button>
        <div>
          <p className="text-sm text-muted-foreground">Dashboard mensile</p>
          <h2 className="text-2xl font-black">I tuoi obiettivi</h2>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">Imposta i tuoi traguardi mensili e settimanali. La dashboard li aggiornerà automaticamente in base alle registrazioni.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted-foreground">Ore mensili
                <Input type="number" min="0" step="1" value={goalDraft.monthlyHours} onChange={(event) => setGoalDraft((current) => ({ ...current, monthlyHours: Number(event.target.value) }))} className="mt-2" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">Ore settimanali
                <Input type="number" min="0" step="1" value={goalDraft.weeklyHours} onChange={(event) => setGoalDraft((current) => ({ ...current, weeklyHours: Number(event.target.value) }))} className="mt-2" />
              </label>
            </div>
            <label className="block text-xs font-semibold text-muted-foreground">Guadagno mensile (€)
              <Input type="number" min="0" step="50" value={goalDraft.monthlyEarnings} onChange={(event) => setGoalDraft((current) => ({ ...current, monthlyEarnings: Number(event.target.value) }))} className="mt-2" />
            </label>
            {jobs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground">Obiettivo mensile per lavoro</p>
                {jobs.map((job) => (
                  <label key={job.id} className="block text-xs font-semibold text-muted-foreground">
                    {job.name}{job.client ? ` · ${job.client}` : ''}
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      value={goalDraft.jobMonthlyEarnings[job.id] ?? ''}
                      placeholder="€"
                      onChange={(event) => setGoalDraft((current) => ({
                        ...current,
                        jobMonthlyEarnings: {
                          ...current.jobMonthlyEarnings,
                          [job.id]: Number(event.target.value),
                        },
                      }))}
                      className="mt-2"
                    />
                  </label>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={() => void saveGoals()} disabled={savingGoals}>
              <Check className="mr-2 h-4 w-4" /> Salva obiettivi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="view-enter space-y-4 pb-24">
      <div>
        <p className="text-sm text-muted-foreground">Il tuo profilo</p>
        <h2 className="text-2xl font-black">Ciao, {displayName}</h2>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <span className="text-lg font-black">{displayName.charAt(0).toUpperCase() || <UserRound className="h-6 w-6" />}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{displayName}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{email}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
            <label htmlFor="display-name" className="mb-2 block text-xs font-semibold text-muted-foreground">Nome visualizzato</label>
            {editingName ? (
              <div className="flex gap-2">
                <Input id="display-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
                <Button size="icon" onClick={() => void saveName()} disabled={savingName || !name.trim()} aria-label="Salva nome">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-between" onClick={() => setEditingName(true)}>
                <span>{displayName}</span>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
            <label htmlFor="theme-select" className="mb-2 block text-xs font-semibold text-muted-foreground">Aspetto dell’app</label>
            <Select
              id="theme-select"
              value={theme}
              onChange={(value) => onThemeChange(value as Theme)}
              options={[{ value: 'dark', label: '🌙 Modalità scura' }, { value: 'light', label: '☀️ Modalità chiara' }]}
            />
          </div>
          <button type="button" onClick={() => setPasswordView(true)} className="flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface-raised">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-4 w-4" /></span>
            <span className="flex-1"><span className="block text-sm font-semibold">Password</span><span className="block text-xs text-muted-foreground">Cambia la password dell’account</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button type="button" onClick={() => setGoalsView(true)} className="flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface-raised">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-4 w-4" /></span>
            <span className="flex-1"><span className="block text-sm font-semibold">Obiettivi</span><span className="block text-xs text-muted-foreground">{goalDraft.monthlyHours} ore · {formatCurrency(goalDraft.monthlyEarnings)} al mese</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Esci dall’account
          </Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><BriefcaseBusiness className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-black">{jobsCount}</p><p className="text-xs text-muted-foreground">Lavori attivi</p></CardContent></Card>
        <Card><CardContent className="p-4"><ClipboardList className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-black">{entriesCount}</p><p className="text-xs text-muted-foreground">Registrazioni</p></CardContent></Card>
      </div>
      <Card><CardContent className="flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" /><div><p className="text-sm font-semibold">I tuoi dati sono protetti</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">L’accesso è riservato al tuo account e le operazioni sono protette dalle policy di sicurezza del database.</p></div></CardContent></Card>
      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        Creato da Antonio con <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" aria-label="amore" /> per Anna
      </p>
    </div>
  )
}
