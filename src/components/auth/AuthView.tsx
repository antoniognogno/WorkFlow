import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

interface AuthViewProps {
  recovery?: boolean
}

export function AuthView({ recovery = false }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    if (recovery) {
      const result = await supabase.auth.updateUser({ password })
      setLoading(false)
      if (result.error) setError(result.error.message)
      else {
        setMessage('Password aggiornata. Verrai reindirizzato al login.')
        window.history.replaceState({}, document.title, window.location.pathname)
        window.setTimeout(() => void supabase.auth.signOut(), 600)
      }
      return
    }
    if (isReset) {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })
      setLoading(false)
      if (result.error) setError(result.error.message)
      else setMessage('Controlla la tua email: abbiamo inviato il link per reimpostare la password.')
      return
    }
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
    } else if (isSignUp) {
      setMessage('Controlla la tua email per confermare l’account.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <h1 className="text-xl font-bold">WorkFlow</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {recovery ? 'Scegli una nuova password' : isReset ? 'Reimposta la tua password' : isSignUp ? 'Crea il tuo account' : 'Accedi per ritrovare i tuoi dati'}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {!recovery && !isReset && (
              <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            )}
            {isReset ? (
              <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            ) : (
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={recovery ? 'Nuova password (almeno 6 caratteri)' : 'Password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  className="pr-12"
                  aria-label={recovery ? 'Nuova password' : 'Password'}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Attendi…' : recovery ? 'Aggiorna password' : isReset ? 'Invia link di reset' : isSignUp ? 'Crea account' : 'Accedi'}
            </Button>
          </form>
          {!recovery && (
            <>
              {!isReset ? (
                <>
                  <button type="button" className="w-full text-sm text-primary" onClick={() => setIsSignUp((value) => !value)}>
                    {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                  </button>
                  {!isSignUp && (
                    <button type="button" className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setIsReset(true)}>
                      Password dimenticata?
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="flex w-full items-center justify-center gap-1 text-sm text-primary" onClick={() => setIsReset(false)}>
                  <ArrowLeft className="h-4 w-4" /> Torna al login
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
