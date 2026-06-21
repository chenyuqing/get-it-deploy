/**
 * Temporary debug endpoint to verify environment variables
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasUserPasswords: !!process.env.USER_PASSWORDS,
    userPasswordsLength: process.env.USER_PASSWORDS?.length || 0,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  })
}
