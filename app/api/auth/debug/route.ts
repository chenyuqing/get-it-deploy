/**
 * Debug endpoint to check auth cookie status
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get('app-auth')

  return NextResponse.json({
    hasCookie: !!authCookie,
    cookieValue: authCookie?.value,
    isAuthenticated: authCookie?.value === 'authenticated',
    allCookies: Array.from(request.cookies.getAll()).map(c => ({
      name: c.name,
      value: c.value
    }))
  })
}
