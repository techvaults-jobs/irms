import React from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-secondary-900 mb-2">
          {label}
          {props.required && <span className="text-primary-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">{icon}</div>}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 border rounded-md transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            icon ? 'pl-10' : '',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
              : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-100',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {helperText && !error && <p className="text-sm text-secondary-600 mt-2">{helperText}</p>}
    </div>
  )
)

Input.displayName = 'Input'
