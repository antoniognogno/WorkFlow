import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserRound, LogOut, Mail } from 'lucide-react'
import type { Theme } from '@/App'

interface ProfileViewProps {
  email: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSignOut: () => void
}

export function ProfileView({ email, theme, onThemeChange, onSignOut }: ProfileViewProps) {
  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-sm text-muted-foreground">Il tuo profilo</p>
        <h2 className="text-2xl font-black">Ciao, {email}</h2>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Account personale</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{email}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
            <label htmlFor="theme-select" className="mb-2 block text-xs font-semibold text-muted-foreground">Aspetto dell’app</label>
            <select
              id="theme-select"
              value={theme}
              onChange={(event) => onThemeChange(event.target.value as Theme)}
              className="select-modern"
            >
              <option value="dark">🌙 Modalità scura</option>
              <option value="light">☀️ Modalità chiara</option>
            </select>
          </div>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Esci dall’account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
