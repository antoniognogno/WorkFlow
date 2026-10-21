import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
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
            <h1 className="text-xl font-bold">Ore &amp; Paga</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp ? 'Crea il tuo account' : 'Accedi per ritrovare i tuoi dati'}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input type="password" placeholder="Password (almeno 6 caratteri)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Attendi…' : isSignUp ? 'Crea account' : 'Accedi'}
            </Button>
          </form>
          <button type="button" className="w-full text-sm text-primary" onClick={() => setIsSignUp((value) => !value)}>
            {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
          </button>
        </CardContent>
      </Card>
    </main>
  )
}
