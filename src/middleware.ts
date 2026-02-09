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
    const response = NextResponse.next()
    // Add cache control headers for auth endpoints
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    const response = NextResponse.next()
    // Add cache control headers for auth pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl))
  }

  // Add cache control headers for protected pages
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

