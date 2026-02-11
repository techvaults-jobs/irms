import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Allow static files and public assets
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$|^\/favicon\.ico$|^\/sw\.js$/.test(pathname)) {
    return NextResponse.next()
  }

  // Allow all auth API endpoints without session check
  if (pathname.startsWith('/api/auth')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Get session
  const session = await auth()
  const isLoggedIn = !!session
  const isAuthPage = pathname.startsWith('/auth')

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isLoggedIn && !pathname.startsWith('/api/health') && !pathname.startsWith('/api/init')) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl))
  }

  // Add cache control headers
  const response = NextResponse.next()
  if (isAuthPage || pathname.startsWith('/auth')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  } else if (isLoggedIn) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js).*)'],
}

