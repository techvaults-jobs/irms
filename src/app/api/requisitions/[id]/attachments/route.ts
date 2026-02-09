import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, validateFile } from '@/services/file-storage.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify requisition exists and user has access
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Only staff who created it or admins can upload
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

    // Only allow uploads for draft requisitions
    if (requisition.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only upload attachments to draft requisitions' },
        { status: 422 }
      )
    }

    // Check attachment count limit (max 5 per requisition)
    const attachmentCount = await prisma.attachment.count({
      where: { requisitionId },
    })

    if (attachmentCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 attachments per requisition' },
        { status: 422 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadFile(file, requisitionId)

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        requisitionId,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        storageUrl: uploadResult.url,
        uploadedBy: session.user.id,
      },
    })

    // Record in audit trail
    await AuditTrailService.recordChange(
      requisitionId,
      session.user.id,
      'ATTACHMENT_UPLOADED',
      'attachment',
      null,
      JSON.stringify({
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        fileType: attachment.fileType,
      })
    )

    return NextResponse.json(attachment, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload attachment' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Check access: staff can only see their own, others can see all
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

    const attachments = await prisma.attachment.findMany({
      where: { requisitionId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(attachments)
  } catch (error: any) {
    console.error('Error listing attachments:', error)
    return NextResponse.json(
      { error: 'Failed to list attachments' },
      { status: 500 }
    )
  }
}
