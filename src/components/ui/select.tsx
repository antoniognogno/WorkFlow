import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  required?: boolean
  'aria-label'?: string
}

export function Select({ id, value, options, onChange, className, required, 'aria-label': ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen((current) => !current)}
        className="select-modern flex w-full items-center justify-between text-left"
      >
        <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>{selected?.label ?? 'Seleziona…'}</span>
        <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="listbox" aria-labelledby={id} className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card p-1 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={cn('flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70', option.value === value && 'bg-primary/10 font-semibold text-primary')}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check className="ml-2 h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
