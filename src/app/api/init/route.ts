import { NextRequest, NextResponse } from 'next/server'
import { ReminderJobSchedulerService } from '@/services/reminder-job-scheduler.service'

/**
 * Initialization API Route
 * Handles application initialization tasks including starting the reminder job scheduler
 * 
 * This route should be called once when the application starts up.
 * In production, this would typically be called by a startup hook or initialization service.
 */

export async function POST(request: NextRequest) {
  try {
    // Start the reminder job scheduler
    ReminderJobSchedulerService.startScheduler()

    const status = ReminderJobSchedulerService.getSchedulerStatus()

    return NextResponse.json(
      {
        success: true,
        message: 'Application initialized successfully',
        scheduler: status,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during application initialization:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize application',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = ReminderJobSchedulerService.getSchedulerStatus()

    return NextResponse.json(
      {
        success: true,
        scheduler: status,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scheduler status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
