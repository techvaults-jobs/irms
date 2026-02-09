'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, Mail, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TempLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('techvaults@gmail.com')
  const [password, setPassword] = useState('TechVaults@2024!')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      if (data.success) {
        // Store user info in localStorage temporarily
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('loggedIn', 'true')
        
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        setError(data.error || 'Login failed')
        setIsLoading(false)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Creative Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 p-1 animate-spin" style={{ animationDuration: '8s' }}>
                <div className="absolute inset-0 rounded-full bg-white/95" />
              </div>
              
              <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-full shadow-xl border-4 border-white">
                <Image
                  src="/logo-sm.png"
                  alt="IRMS Logo"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-contain drop-shadow-lg"
                />
              </div>
              
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">IRMS</h1>
            <p className="text-sm text-gray-600 mt-2 text-center font-medium">Internal Requisition Management System</p>
            <p className="text-xs text-amber-600 mt-3 text-center bg-amber-50 px-3 py-1 rounded-full">
              ⚠️ Temporary Login (NEXTAUTH_SECRET not set)
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 text-sm">Login Failed</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
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
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
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

          {/* Info Box */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900 font-semibold mb-2">⚠️ Temporary Login Active</p>
              <p className="text-blue-800 text-xs">
                This is a temporary login page. To enable the standard NextAuth login, set NEXTAUTH_SECRET in your Vercel environment variables.
              </p>
              <p className="text-blue-800 text-xs mt-2">
                <strong>Test credentials:</strong><br/>
                Email: techvaults@gmail.com<br/>
                Password: TechVaults@2024!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-gray-700">Techvaults</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
