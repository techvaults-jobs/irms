import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const requisitionId = params.id
    const attachmentId = params.attachmentId

    // Verify requisition exists
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Check access: staff can only download their own, others can download all
    const userRole = session.user.role as UserRole
    if (
      userRole === 'STAFF' &&
      requisition.submitterId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Verify attachment exists and belongs to this requisition
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment || attachment.requisitionId !== requisitionId) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Record download in audit trail
    await AuditTrailService.recordChange(
      requisitionId,
      session.user.id,
      'ATTACHMENT_DOWNLOADED',
      'attachment',
      null,
      JSON.stringify({
        fileName: attachment.fileName,
        downloadedAt: new Date().toISOString(),
      })
    )

    // Redirect to the storage URL
    return NextResponse.redirect(attachment.storageUrl)
  } catch (error: any) {
    console.error('Error downloading attachment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download attachment' },
      { status: 500 }
    )
  }
}
