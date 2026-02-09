'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<'invalid' | 'network' | 'server' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

  // Load email and password from URL params on mount
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const passwordParam = searchParams.get('password')
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    if (passwordParam) {
      setPassword(decodeURIComponent(passwordParam))
    }
  }, [searchParams])

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const getErrorMessage = (type: string | null) => {
    switch (type) {
      case 'invalid':
        return {
          title: 'Invalid Credentials',
          message: 'The email or password you entered is incorrect. Please check and try again.',
          icon: AlertCircle
        }
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          icon: AlertCircle
        }
      case 'server':
        return {
          title: 'Server Error',
          message: 'The server is temporarily unavailable. Please try again in a moment.',
          icon: AlertCircle
        }
      default:
        return {
          title: 'Login Failed',
          message: 'An unexpected error occurred. Please try again.',
          icon: AlertCircle
        }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!validateForm()) {
      return
    }
    
    setError('')
    setErrorType(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (!result) {
        setError('No response from authentication server')
        setErrorType('server')
        setIsLoading(false)
        return
      }

      if (result?.error) {
        // Determine error type based on error message
        if (result.error.includes('CredentialsSignin')) {
          setErrorType('invalid')
          setError('Invalid email or password. Please try again.')
        } else if (result.error.includes('network') || result.error.includes('fetch')) {
          setErrorType('network')
          setError('Network connection error. Please check your internet and try again.')
        } else {
          setErrorType('server')
          setError(result.error || 'Authentication failed. Please try again.')
        }
        setIsLoading(false)
      } else if (result?.ok) {
        // Use window.location for a hard redirect to ensure session is established
        window.location.href = '/dashboard'
      } else {
        setErrorType('server')
        setError('An unexpected error occurred. Please try again.')
        setIsLoading(false)
      }
    } catch (err: any) {
      setErrorType('network')
      setError('An error occurred. Please check your connection and try again.')
      setIsLoading(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 text-sm">
              {getErrorMessage(errorType).title}
            </h3>
            <p className="text-red-700 text-sm mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className={`h-5 w-5 ${validationErrors.email ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`block w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                validationErrors.email
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-red-500'
              }`}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined })
                }
              }}
            />
          </div>
          {validationErrors.email && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationErrors.email}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${validationErrors.password ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={`block w-full pl-10 pr-12 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                validationErrors.password
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-red-500'
              }`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined })
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationErrors.password}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  )
}
