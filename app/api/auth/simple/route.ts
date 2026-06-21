/**
 * Simple password authentication
 * Sets a cookie if password matches APP_PASSWORD
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    const correctPassword = process.env.APP_PASSWORD

    if (!correctPassword) {
      return NextResponse.json(
        { error: 'APP_PASSWORD not configured' },
        { status: 500 }
      )
    }

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true })

      // Set auth cookie (30 days)
      response.cookies.set('app-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      return response
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
