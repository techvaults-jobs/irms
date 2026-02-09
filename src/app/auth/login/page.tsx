'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import { LoginForm } from '@/components/LoginForm'

function LoginContent() {
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
            {/* Animated logo container with gradient ring */}
            <div className="relative mb-6">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 p-1 animate-spin" style={{ animationDuration: '8s' }}>
                <div className="absolute inset-0 rounded-full bg-white/95" />
              </div>
              
              {/* Logo container */}
              <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-full shadow-xl border-4 border-white">
                <Image
                  src="/logo-sm.png"
                  alt="IRMS Logo"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-contain drop-shadow-lg"
                />
              </div>
              
              {/* Floating accent dots */}
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">IRMS</h1>
            <p className="text-sm text-gray-600 mt-2 text-center font-medium">Internal Requisition Management System</p>
          </div>

          {/* Login Form Component */}
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-gray-700">Techvaults</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginContent />
}

