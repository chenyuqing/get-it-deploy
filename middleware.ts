/**
 * Simple password-based middleware
 * No database, just check APP_PASSWORD cookie
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth')
  const isHealthCheck = request.nextUrl.pathname === '/api/codex/health'
  const isPublicShare = request.nextUrl.pathname.startsWith('/share/')

  // Allow public routes
  if (isLoginPage || isApiAuth || isHealthCheck || isPublicShare) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('app-auth')

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
