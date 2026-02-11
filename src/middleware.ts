import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Allow static files and public assets
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$|^\/favicon\.ico$|^\/sw\.js$/.test(pathname)) {
    return NextResponse.next()
  }

  // Allow all auth API endpoints
  if (pathname.startsWith('/api/auth')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Allow health and init endpoints
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/init')) {
    return NextResponse.next()
  }

  // Allow auth pages
  if (pathname.startsWith('/auth')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // For all other routes, add cache control headers but don't block
  // Auth checks will be done in page components and API routes
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js).*)'],
}

