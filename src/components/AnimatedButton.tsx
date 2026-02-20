'use client'

import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import { ReactNode } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white hover:opacity-90 active:opacity-80 focus:ring-brand-primary shadow-md hover:shadow-lg',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-400 shadow-sm hover:shadow-md',
        outlined: 'border-2 border-brand-primary text-brand-primary hover:bg-red-50 active:bg-red-100 focus:ring-brand-primary',
        text: 'text-brand-primary hover:bg-red-50 active:bg-red-100 focus:ring-brand-primary',
        danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500 shadow-md hover:shadow-lg',
        success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 focus:ring-success-500 shadow-md hover:shadow-lg',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function AnimatedButton({
  className,
  variant,
  size,
  fullWidth,
  isLoading,
  icon,
  children,
  disabled,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      className={clsx(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      {...(props as any)}
    >
      <motion.div
        className="flex items-center gap-2"
        animate={isLoading ? { opacity: 0.6 } : { opacity: 1 }}
      >
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        )}
        {icon && !isLoading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            {icon}
          </motion.div>
        )}
        <span>{children}</span>
      </motion.div>
    </motion.button>
  )
}
