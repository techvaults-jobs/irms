import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { validatePaginationParams, formatPaginationResult } from '@/lib/pagination'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { createRequisitionSchema, paginationSchema } from '@/lib/validation-schemas'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only staff can create requisitions' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await validateRequestBody(req, createRequisitionSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const requisition = await RequisitionService.createRequisition(
      body,
      session.user.id,
      session.user.departmentId || ''
    )

    // Record creation in audit trail
    await AuditTrailService.recordCreation(
      requisition.id,
      session.user.id,
      {
        title: requisition.title,
        category: requisition.category,
        description: requisition.description,
        estimatedCost: requisition.estimatedCost.toString(),
        currency: requisition.currency,
        urgencyLevel: requisition.urgencyLevel,
        businessJustification: requisition.businessJustification,
      }
    )

    return NextResponse.json(requisition, { status: 201 })
  } catch (error: any) {
    console.error('Error creating requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create requisition' },
      { status: 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    const searchParams = req.nextUrl.searchParams
    
    // Validate pagination parameters
    const { skip, take } = validatePaginationParams(
      searchParams.get('skip'),
      searchParams.get('take'),
      100
    )
    
    const status = searchParams.get('status') || undefined

    let filters: any = { skip, take }

    // Apply role-based filtering
    if (userRole === 'STAFF') {
      filters.submitterId = session.user.id
    } else if (userRole === 'MANAGER') {
      filters.departmentId = session.user.departmentId
    }
    // FINANCE and ADMIN can see all

    if (status) {
      filters.status = status
    }

    const requisitions = await RequisitionService.listRequisitions(filters)
    const total = await RequisitionService.countRequisitions(
      Object.fromEntries(
        Object.entries(filters).filter(([key]) => !['skip', 'take'].includes(key))
      )
    )

    const result = formatPaginationResult(requisitions, skip, take, total)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error listing requisitions:', error)
    return NextResponse.json(
      { error: 'Failed to list requisitions' },
      { status: 500 }
    )
  }
}
