import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/services/file-storage.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function DELETE(
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

    // Only allow deletion from draft requisitions
    if (requisition.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete attachments from draft requisitions' },
        { status: 422 }
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

    // Check access: staff can only delete their own, admins can delete any
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

    // Delete from storage
    await deleteFile(attachment.storageUrl)

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    })

    // Record in audit trail
    await AuditTrailService.recordChange(
      requisitionId,
      session.user.id,
      'ATTACHMENT_DELETED',
      'attachment',
      JSON.stringify({
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
      }),
      null
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}
