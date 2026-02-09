import { prisma } from '@/lib/prisma'

/**
 * Referential Integrity Checks
 * Validates that all foreign key relationships are valid before operations
 * Requirement 10.4: Enforce referential integrity and prevent orphaned records
 */

export class ReferentialIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReferentialIntegrityError'
  }
}

export class ReferentialIntegrityChecker {
  /**
   * Validates that a user exists and is active
   */
  static async validateUserExists(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ReferentialIntegrityError(`User with ID ${userId} not found`)
    }

    if (!user.isActive) {
      throw new ReferentialIntegrityError(`User with ID ${userId} is not active`)
    }
  }

  /**
   * Validates that a department exists
   */
  static async validateDepartmentExists(departmentId: string): Promise<void> {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      throw new ReferentialIntegrityError(`Department with ID ${departmentId} not found`)
    }
  }

  /**
   * Validates that a requisition exists
   */
  static async validateRequisitionExists(requisitionId: string): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }
  }

  /**
   * Validates that an approval step exists
   */
  static async validateApprovalStepExists(stepId: string): Promise<void> {
    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
    })

    if (!step) {
      throw new ReferentialIntegrityError(`Approval step with ID ${stepId} not found`)
    }
  }

  /**
   * Validates that an attachment exists
   */
  static async validateAttachmentExists(attachmentId: string): Promise<void> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      throw new ReferentialIntegrityError(`Attachment with ID ${attachmentId} not found`)
    }
  }

  /**
   * Validates that a user belongs to a department
   */
  static async validateUserInDepartment(userId: string, departmentId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ReferentialIntegrityError(`User with ID ${userId} not found`)
    }

    if (user.departmentId !== departmentId) {
      throw new ReferentialIntegrityError(
        `User ${userId} does not belong to department ${departmentId}`
      )
    }
  }

  /**
   * Validates that a requisition belongs to a department
   */
  static async validateRequisitionInDepartment(
    requisitionId: string,
    departmentId: string
  ): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }

    if (requisition.departmentId !== departmentId) {
      throw new ReferentialIntegrityError(
        `Requisition ${requisitionId} does not belong to department ${departmentId}`
      )
    }
  }

  /**
   * Validates that a requisition was created by a user
   */
  static async validateRequisitionCreatedBy(
    requisitionId: string,
    userId: string
  ): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }

    if (requisition.submitterId !== userId) {
      throw new ReferentialIntegrityError(
        `Requisition ${requisitionId} was not created by user ${userId}`
      )
    }
  }

  /**
   * Validates that an attachment belongs to a requisition
   */
  static async validateAttachmentInRequisition(
    attachmentId: string,
    requisitionId: string
  ): Promise<void> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      throw new ReferentialIntegrityError(`Attachment with ID ${attachmentId} not found`)
    }

    if (attachment.requisitionId !== requisitionId) {
      throw new ReferentialIntegrityError(
        `Attachment ${attachmentId} does not belong to requisition ${requisitionId}`
      )
    }
  }

  /**
   * Validates that an approval step belongs to a requisition
   */
  static async validateApprovalStepInRequisition(
    stepId: string,
    requisitionId: string
  ): Promise<void> {
    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
    })

    if (!step) {
      throw new ReferentialIntegrityError(`Approval step with ID ${stepId} not found`)
    }

    if (step.requisitionId !== requisitionId) {
      throw new ReferentialIntegrityError(
        `Approval step ${stepId} does not belong to requisition ${requisitionId}`
      )
    }
  }

  /**
   * Validates that an audit trail entry belongs to a requisition
   */
  static async validateAuditTrailInRequisition(
    auditId: string,
    requisitionId: string
  ): Promise<void> {
    const auditEntry = await prisma.auditTrail.findUnique({
      where: { id: auditId },
    })

    if (!auditEntry) {
      throw new ReferentialIntegrityError(`Audit trail entry with ID ${auditId} not found`)
    }

    if (auditEntry.requisitionId !== requisitionId) {
      throw new ReferentialIntegrityError(
        `Audit trail entry ${auditId} does not belong to requisition ${requisitionId}`
      )
    }
  }

  /**
   * Validates that a user has a valid role
   */
  static validateUserRole(role: string): void {
    const validRoles = ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN']
    if (!validRoles.includes(role)) {
      throw new ReferentialIntegrityError(`Invalid user role: ${role}`)
    }
  }

  /**
   * Validates that a requisition status is valid
   */
  static validateRequisitionStatus(status: string): void {
    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED']
    if (!validStatuses.includes(status)) {
      throw new ReferentialIntegrityError(`Invalid requisition status: ${status}`)
    }
  }

  /**
   * Validates that an approval step status is valid
   */
  static validateApprovalStepStatus(status: string): void {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED']
    if (!validStatuses.includes(status)) {
      throw new ReferentialIntegrityError(`Invalid approval step status: ${status}`)
    }
  }

  /**
   * Validates that an approval rule has valid approver roles
   */
  static validateApproverRoles(roles: string[]): void {
    const validRoles = ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN']
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        throw new ReferentialIntegrityError(`Invalid approver role: ${role}`)
      }
    }
  }

  /**
   * Validates that an email is unique (not already in use)
   */
  static async validateEmailUnique(email: string, excludeUserId?: string): Promise<void> {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && (!excludeUserId || existingUser.id !== excludeUserId)) {
      throw new ReferentialIntegrityError(`Email ${email} is already in use`)
    }
  }

  /**
   * Validates that a department name is unique (not already in use)
   */
  static async validateDepartmentNameUnique(
    name: string,
    excludeDepartmentId?: string
  ): Promise<void> {
    const existingDepartment = await prisma.department.findUnique({
      where: { name },
    })

    if (
      existingDepartment &&
      (!excludeDepartmentId || existingDepartment.id !== excludeDepartmentId)
    ) {
      throw new ReferentialIntegrityError(`Department name ${name} is already in use`)
    }
  }

  /**
   * Validates that a user can be assigned to an approval step
   * (user must have the required role and be active)
   */
  static async validateUserCanApprove(userId: string, requiredRole: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ReferentialIntegrityError(`User with ID ${userId} not found`)
    }

    if (!user.isActive) {
      throw new ReferentialIntegrityError(`User ${userId} is not active`)
    }

    if (user.role !== requiredRole) {
      throw new ReferentialIntegrityError(
        `User ${userId} does not have required role ${requiredRole}`
      )
    }
  }

  /**
   * Validates that a requisition can transition to a new status
   * (checks that the current status allows the transition)
   */
  static validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['PAID', 'REJECTED'],
      REJECTED: [],
      PAID: ['CLOSED'],
      CLOSED: [],
    }

    const allowedTransitions = validTransitions[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      throw new ReferentialIntegrityError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      )
    }
  }

  /**
   * Validates that a requisition has no orphaned approval steps
   */
  static async validateRequisitionApprovalSteps(requisitionId: string): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }

    const approvalSteps = await prisma.approvalStep.findMany({
      where: { requisitionId },
    })

    // Verify all approval steps have valid assigned users (if assigned)
    for (const step of approvalSteps) {
      if (step.assignedUserId) {
        const user = await prisma.user.findUnique({
          where: { id: step.assignedUserId },
        })

        if (!user) {
          throw new ReferentialIntegrityError(
            `Approval step ${step.id} references non-existent user ${step.assignedUserId}`
          )
        }
      }
    }
  }

  /**
   * Validates that a requisition has no orphaned attachments
   */
  static async validateRequisitionAttachments(requisitionId: string): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }

    const attachments = await prisma.attachment.findMany({
      where: { requisitionId },
    })

    // Verify all attachments have valid uploaded by users
    for (const attachment of attachments) {
      const user = await prisma.user.findUnique({
        where: { id: attachment.uploadedBy },
      })

      if (!user) {
        throw new ReferentialIntegrityError(
          `Attachment ${attachment.id} references non-existent user ${attachment.uploadedBy}`
        )
      }
    }
  }

  /**
   * Validates that a requisition has no orphaned audit trail entries
   */
  static async validateRequisitionAuditTrail(requisitionId: string): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new ReferentialIntegrityError(`Requisition with ID ${requisitionId} not found`)
    }

    const auditEntries = await prisma.auditTrail.findMany({
      where: { requisitionId },
    })

    // Verify all audit entries have valid users
    for (const entry of auditEntries) {
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
      })

      if (!user) {
        throw new ReferentialIntegrityError(
          `Audit trail entry ${entry.id} references non-existent user ${entry.userId}`
        )
      }
    }
  }
}
