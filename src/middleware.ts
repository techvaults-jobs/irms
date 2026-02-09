import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const middleware = auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/auth')
  const isAuthApi = pathname.startsWith('/api/auth')

  // Allow static files (images, fonts, etc.)
  const isStaticFile = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i.test(pathname)
  if (isStaticFile) {
    return NextResponse.next()
  }

  // Allow all auth API endpoints
  if (isAuthApi) {
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

