/**
 * Temporary debug endpoint to test auth logic
 */

import { NextResponse } from 'next/server'
import { validateCredentials, getValidUsernames } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json()
  const { username, password } = body

  const validUsernames = getValidUsernames()
  const isValid = await validateCredentials(username, password)

  return NextResponse.json({
    validUsernames,
    testedUsername: username,
    testedPasswordLength: password?.length || 0,
    isValid: !!isValid,
    envRaw: process.env.USER_PASSWORDS
  })
}
