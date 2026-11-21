import { BriefcaseBusiness, CalendarDays, ClipboardList, MessageSquareText, UserRound, WalletCards } from 'lucide-react'

export type TabType = 'reg' | 'rep' | 'payments' | 'jobs' | 'msg' | 'profile'

interface BottomNavProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: Array<{ id: TabType; label: string; icon: typeof CalendarDays }> = [
  { id: 'reg', label: 'Registra', icon: CalendarDays },
  { id: 'rep', label: 'Report', icon: ClipboardList },
  { id: 'payments', label: 'Pagamenti', icon: WalletCards },
  { id: 'jobs', label: 'Lavori', icon: BriefcaseBusiness },
  { id: 'msg', label: 'Messaggio', icon: MessageSquareText },
  { id: 'profile', label: 'Profilo', icon: UserRound },
]

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 z-40 border-t border-border/80 bg-background/90 shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md justify-around px-2 pb-safe-bottom pt-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] transition-all duration-200 ${
              currentTab === id ? 'bg-primary/10 font-semibold text-primary shadow-sm' : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground'
            }`}
          >
            {currentTab === id && <span className="absolute -top-1 h-0.5 w-5 rounded-full bg-primary motion-safe:animate-[nav-indicator_220ms_ease-out]" />}
            <Icon className={`h-5 w-5 transition-transform duration-200 ${currentTab === id ? 'scale-105' : 'scale-100'}`} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
