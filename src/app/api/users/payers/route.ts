import { auth } from '@/auth'
import { PaymentInstructionsService } from '@/services/payment-instructions.service'
import { NextResponse } from 'next/server'

/** Users a payment can be assigned to. Available to everyone who can approve. */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['MANAGER', 'FINANCE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(await PaymentInstructionsService.listPayers())
  } catch (error: any) {
    console.error('Error listing payers:', error)
    return NextResponse.json({ error: 'Failed to list payers' }, { status: 500 })
  }
}
