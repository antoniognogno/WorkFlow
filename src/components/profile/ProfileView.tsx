import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { UserRound, LogOut, Mail, Heart, BriefcaseBusiness, ClipboardList, ShieldCheck, Pencil, Check, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import type { Theme } from '@/App'
import { Select } from '@/components/ui/select'

interface ProfileViewProps {
  email: string
  displayName: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSignOut: () => void
  onDisplayNameChange: (displayName: string) => Promise<void>
  onPasswordChange: (password: string) => Promise<void>
  onEmailChange: (email: string) => Promise<void>
  onDeleteAccount: () => Promise<void>
  jobsCount: number
  entriesCount: number
}

export function ProfileView({ email, displayName, theme, onThemeChange, onSignOut, onDisplayNameChange, onPasswordChange, onEmailChange, onDeleteAccount, jobsCount, entriesCount }: ProfileViewProps) {
  const [name, setName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState(email)
  const [changingEmail, setChangingEmail] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const saveName = async () => {
    const nextName = name.trim()
    if (!nextName) return
    setSavingName(true)
    await onDisplayNameChange(nextName)
    setSavingName(false)
    setEditingName(false)
  }

  const savePassword = async () => {
    if (newPassword.length < 6) return
    setChangingPassword(true)
    await onPasswordChange(newPassword)
    setNewPassword('')
    setChangingPassword(false)
  }

  const saveEmail = async () => {
    if (!newEmail.trim()) return
    setChangingEmail(true)
    await onEmailChange(newEmail.trim())
    setChangingEmail(false)
  }

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'ELIMINA') return
    setDeletingAccount(true)
    await onDeleteAccount()
    setDeletingAccount(false)
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
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
            <label htmlFor="profile-email" className="mb-2 block text-xs font-semibold text-muted-foreground">Email account</label>
            <div className="flex gap-2">
              <Input id="profile-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
              <Button size="icon" onClick={() => void saveEmail()} disabled={changingEmail || newEmail.trim() === email} aria-label="Conferma nuova email"><Mail className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
            <label htmlFor="profile-password" className="mb-2 block text-xs font-semibold text-muted-foreground">Nuova password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input id="profile-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} className="pr-12" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Nascondi nuova password' : 'Mostra nuova password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button size="icon" onClick={() => void savePassword()} disabled={changingPassword || newPassword.length < 6} aria-label="Cambia password"><KeyRound className="h-4 w-4" /></Button>
            </div>
          </div>
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
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Elimina account</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Questa azione elimina definitivamente profilo, lavori, registrazioni e pagamenti.</p>
            </div>
          </div>
          {deleteConfirmation === 'ELIMINA' ? (
            <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => void deleteAccount()} disabled={deletingAccount}>
              Conferma eliminazione definitiva
            </Button>
          ) : (
            <div className="space-y-2">
              <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Scrivi ELIMINA" aria-label="Conferma eliminazione account" />
              <p className="text-[11px] text-muted-foreground">Digita <strong>ELIMINA</strong> per abilitare il pulsante.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        Creato da Antonio con <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" aria-label="amore" /> per Anna
      </p>
    </div>
  )
}
