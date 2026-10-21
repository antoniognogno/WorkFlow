import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-border/90 bg-background/80 px-3 py-2 text-sm outline-none shadow-sm transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-primary/45 focus:border-primary/70 focus:bg-background focus:ring-0',
        className,
      )}
      {...props}
    />
  )
}
