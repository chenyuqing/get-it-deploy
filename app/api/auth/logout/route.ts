/**
 * Simple logout - clear auth cookie
 */

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.delete('app-auth')

  return response
}
