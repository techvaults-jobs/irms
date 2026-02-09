/**
 * Status Transition Validation Logic
 * 
 * Defines allowed transitions for each requisition status and provides
 * validation functions to ensure only valid transitions occur.
 * 
 * Status Lifecycle:
 * DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PAID -> CLOSED
 *                    \-> REJECTED (can occur at any approval stage)
 */

export const RequisitionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  CLOSED: 'CLOSED',
} as const

export type RequisitionStatusType = typeof RequisitionStatus[keyof typeof RequisitionStatus]

/**
 * Defines the allowed transitions from each status
 * Maps current status to array of allowed next statuses
 */
const ALLOWED_TRANSITIONS: Record<RequisitionStatusType, RequisitionStatusType[]> = {
  [RequisitionStatus.DRAFT]: [RequisitionStatus.SUBMITTED],
  [RequisitionStatus.SUBMITTED]: [RequisitionStatus.UNDER_REVIEW],
  [RequisitionStatus.UNDER_REVIEW]: [
    RequisitionStatus.APPROVED,
    RequisitionStatus.REJECTED,
  ],
  [RequisitionStatus.APPROVED]: [RequisitionStatus.PAID],
  [RequisitionStatus.REJECTED]: [],
  [RequisitionStatus.PAID]: [RequisitionStatus.CLOSED],
  [RequisitionStatus.CLOSED]: [],
}

/**
 * Validates if a transition from one status to another is allowed
 * @param fromStatus Current status
 * @param toStatus Desired next status
 * @returns true if transition is allowed, false otherwise
 */
export function isValidStatusTransition(
  fromStatus: RequisitionStatusType,
  toStatus: RequisitionStatusType
): boolean {
  const allowedNextStatuses = ALLOWED_TRANSITIONS[fromStatus]
  return allowedNextStatuses?.includes(toStatus) ?? false
}

/**
 * Gets all allowed next statuses for a given status
 * @param status Current status
 * @returns Array of allowed next statuses
 */
export function getAllowedNextStatuses(status: RequisitionStatusType): RequisitionStatusType[] {
  return ALLOWED_TRANSITIONS[status] || []
}

/**
 * Validates a status transition and throws an error if invalid
 * @param fromStatus Current status
 * @param toStatus Desired next status
 * @throws Error if transition is not allowed
 */
export function validateStatusTransition(
  fromStatus: RequisitionStatusType,
  toStatus: RequisitionStatusType
): void {
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    const allowedStatuses = getAllowedNextStatuses(fromStatus)
    throw new Error(
      `Invalid status transition from ${fromStatus} to ${toStatus}. ` +
      `Allowed transitions: ${allowedStatuses.length > 0 ? allowedStatuses.join(', ') : 'none'}`
    )
  }
}

/**
 * Checks if a status is a terminal status (no further transitions allowed)
 * @param status Status to check
 * @returns true if status is terminal, false otherwise
 */
export function isTerminalStatus(status: RequisitionStatusType): boolean {
  return getAllowedNextStatuses(status).length === 0
}

/**
 * Checks if a status is a rejection status
 * @param status Status to check
 * @returns true if status is REJECTED, false otherwise
 */
export function isRejectedStatus(status: RequisitionStatusType): boolean {
  return status === RequisitionStatus.REJECTED
}

/**
 * Checks if a status is an approval-related status
 * @param status Status to check
 * @returns true if status is UNDER_REVIEW, APPROVED, or REJECTED
 */
export function isApprovalRelatedStatus(status: RequisitionStatusType): boolean {
  return [
    RequisitionStatus.UNDER_REVIEW,
    RequisitionStatus.APPROVED,
    RequisitionStatus.REJECTED,
  ].includes(status as any)
}

/**
 * Checks if a status is a financial status
 * @param status Status to check
 * @returns true if status is PAID or CLOSED
 */
export function isFinancialStatus(status: RequisitionStatusType): boolean {
  return [RequisitionStatus.PAID, RequisitionStatus.CLOSED].includes(status as any)
}

/**
 * Gets a human-readable description of a status
 * @param status Status to describe
 * @returns Human-readable description
 */
export function getStatusDescription(status: RequisitionStatusType): string {
  const descriptions: Record<RequisitionStatusType, string> = {
    [RequisitionStatus.DRAFT]: 'Draft - Ready for editing and submission',
    [RequisitionStatus.SUBMITTED]: 'Submitted - Awaiting approval routing',
    [RequisitionStatus.UNDER_REVIEW]: 'Under Review - Pending approver decision',
    [RequisitionStatus.APPROVED]: 'Approved - Ready for payment processing',
    [RequisitionStatus.REJECTED]: 'Rejected - Request denied',
    [RequisitionStatus.PAID]: 'Paid - Payment has been recorded',
    [RequisitionStatus.CLOSED]: 'Closed - Requisition complete',
  }
  return descriptions[status] || 'Unknown status'
}
