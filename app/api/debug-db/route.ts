/**
 * Test database connection
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test connection
    await prisma.$connect()

    // Try to count users
    const userCount = await prisma.user.count()

    // Try to find a specific user
    const timUser = await prisma.user.findUnique({
      where: { username: 'tim' }
    })

    return NextResponse.json({
      success: true,
      userCount,
      timUserExists: !!timUser,
      timUserId: timUser?.id
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
}
