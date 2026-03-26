'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

// Варіанти кнопки для LUMARA Academy
const buttonVariants = {
  variant: {
    primary:
      'bg-gradient-to-r from-lumara-600 to-lumara-500 text-white hover:from-lumara-500 hover:to-lumara-400 glow-purple',
    secondary:
      'bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm',
    ghost: 'text-white/70 hover:text-white hover:bg-white/10',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  },
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  },
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Базові стилі
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
          'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-lumara-500/50',
          // Варіант та розмір
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
