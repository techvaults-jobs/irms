import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check environment variables
    const hasSecret = !!process.env.NEXTAUTH_SECRET
    const hasDatabaseUrl = !!process.env.DATABASE_URL
    const nodeEnv = process.env.NODE_ENV
    const nextAuthUrl = process.env.NEXTAUTH_URL

    // Try to connect to database
    let dbConnected = false
    let userCount = 0
    let dbError = null

    try {
      userCount = await prisma.user.count()
      dbConnected = true
    } catch (error) {
      dbError = String(error)
    }

    return NextResponse.json({
      status: 'debug',
      environment: {
        NODE_ENV: nodeEnv,
        NEXTAUTH_SECRET_SET: hasSecret,
        DATABASE_URL_SET: hasDatabaseUrl,
        NEXTAUTH_URL: nextAuthUrl,
      },
      database: {
        connected: dbConnected,
        userCount,
        error: dbError,
      },
      issues: [
        !hasSecret ? '❌ NEXTAUTH_SECRET is not set' : '✅ NEXTAUTH_SECRET is set',
        !hasDatabaseUrl ? '❌ DATABASE_URL is not set' : '✅ DATABASE_URL is set',
        !dbConnected ? '❌ Cannot connect to database' : '✅ Database connection works',
        nodeEnv !== 'production' ? '⚠️  NODE_ENV is not production' : '✅ NODE_ENV is production',
      ],
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 })
  }
}
