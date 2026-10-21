import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary'
type ButtonSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0',
  outline: 'border border-border/90 bg-transparent shadow-sm hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/70 hover:shadow-md active:translate-y-0',
  ghost: 'hover:bg-muted/70 active:bg-muted',
  secondary: 'bg-muted text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-muted/80 hover:shadow-md active:translate-y-0',
}

const sizes: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-lg px-3',
  icon: 'h-10 w-10',
}

export function Button({ className, variant = 'default', size = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-[background-color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
