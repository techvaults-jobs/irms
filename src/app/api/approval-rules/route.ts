import { auth } from '@/auth'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { validatePaginationParams, formatPaginationResult } from '@/lib/pagination'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { createApprovalRuleSchema } from '@/lib/validation-schemas'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

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
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can view approval rules' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const { skip, take } = validatePaginationParams(
      searchParams.get('skip'),
      searchParams.get('take'),
      100
    )

    const rules = await ApprovalWorkflowService.listApprovalRules(skip, take)
    const total = await ApprovalWorkflowService.countApprovalRules()

    const result = formatPaginationResult(rules, skip, take, total)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error listing approval rules:', error)
    return NextResponse.json(
      { error: 'Failed to list approval rules' },
      { status: 500 }
    )
  }
}

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
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create approval rules' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await validateRequestBody(req, createApprovalRuleSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const rule = await ApprovalWorkflowService.createApprovalRule(body)

    return NextResponse.json(rule, { status: 201 })
  } catch (error: any) {
    console.error('Error creating approval rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create approval rule' },
      { status: 400 }
    )
  }
}
