/**
 * Middleware to protect routes that require authentication.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth')
  const isPublicShare = request.nextUrl.pathname.startsWith('/share/')
  const isHealthCheck = request.nextUrl.pathname === '/api/codex/health'
  const isDebugApi = request.nextUrl.pathname.startsWith('/api/debug-')

  // Allow auth pages, API auth routes, public shares, health check, and debug APIs
  if (isAuthPage || isApiAuthRoute || isPublicShare || isHealthCheck || isDebugApi) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
