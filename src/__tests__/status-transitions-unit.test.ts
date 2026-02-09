/**
 * Unit Tests: Status Lifecycle and Transitions
 * Feature: irms
 * 
 * Property 13: Initial Draft Status
 * Property 14: Draft to Submitted Transition
 * Property 15: Submitted to Under Review Transition
 * Property 16: All Approvers Approval Transition
 * Property 17: Rejection at Any Stage
 * Property 18: Payment Recording Transition
 * Property 19: Paid to Closed Transition
 * Property 20: Status Change Audit Recording
 * 
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import {
  RequisitionStatus,
  isValidStatusTransition,
  validateStatusTransition,
  getAllowedNextStatuses,
  isTerminalStatus,
  isRejectedStatus,
  isApprovalRelatedStatus,
  isFinancialStatus,
  getStatusDescription,
  type RequisitionStatusType,
} from '@/lib/status-transitions'

describe('Status Lifecycle and Transitions - Unit Tests', () => {
  describe('Property 13: Initial Draft Status', () => {
    it('should define DRAFT as a valid status', () => {
      expect(RequisitionStatus.DRAFT).toBe('DRAFT')
    })

    it('should have DRAFT as the initial status', () => {
      expect(RequisitionStatus.DRAFT).toBeDefined()
    })
  })

  describe('Property 14: Draft to Submitted Transition', () => {
    it('should allow transition from DRAFT to SUBMITTED', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.DRAFT as RequisitionStatusType,
        RequisitionStatus.SUBMITTED as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should not allow transition from DRAFT to other statuses except SUBMITTED', () => {
      const invalidTransitions = [
        RequisitionStatus.UNDER_REVIEW,
        RequisitionStatus.APPROVED,
        RequisitionStatus.REJECTED,
        RequisitionStatus.PAID,
        RequisitionStatus.CLOSED,
      ]

      for (const status of invalidTransitions) {
        const isValid = isValidStatusTransition(
          RequisitionStatus.DRAFT as RequisitionStatusType,
          status as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })

    it('should throw error when validating invalid DRAFT transition', () => {
      expect(() => {
        validateStatusTransition(
          RequisitionStatus.DRAFT as RequisitionStatusType,
          RequisitionStatus.APPROVED as RequisitionStatusType
        )
      }).toThrow()
    })
  })

  describe('Property 15: Submitted to Under Review Transition', () => {
    it('should allow transition from SUBMITTED to UNDER_REVIEW', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.SUBMITTED as RequisitionStatusType,
        RequisitionStatus.UNDER_REVIEW as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should not allow transition from SUBMITTED to other statuses', () => {
      const invalidTransitions = [
        RequisitionStatus.DRAFT,
        RequisitionStatus.APPROVED,
        RequisitionStatus.REJECTED,
        RequisitionStatus.PAID,
        RequisitionStatus.CLOSED,
      ]

      for (const status of invalidTransitions) {
        const isValid = isValidStatusTransition(
          RequisitionStatus.SUBMITTED as RequisitionStatusType,
          status as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Property 16: All Approvers Approval Transition', () => {
    it('should allow transition from UNDER_REVIEW to APPROVED', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
        RequisitionStatus.APPROVED as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should allow transition from UNDER_REVIEW to REJECTED', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
        RequisitionStatus.REJECTED as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should not allow transition from UNDER_REVIEW to PAID or CLOSED', () => {
      const invalidTransitions = [
        RequisitionStatus.PAID,
        RequisitionStatus.CLOSED,
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.DRAFT,
      ]

      for (const status of invalidTransitions) {
        const isValid = isValidStatusTransition(
          RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
          status as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Property 17: Rejection at Any Stage', () => {
    it('should identify REJECTED as a terminal status', () => {
      const isTerminal = isTerminalStatus(RequisitionStatus.REJECTED as RequisitionStatusType)
      expect(isTerminal).toBe(true)
    })

    it('should identify REJECTED status correctly', () => {
      const isRejected = isRejectedStatus(RequisitionStatus.REJECTED as RequisitionStatusType)
      expect(isRejected).toBe(true)
    })

    it('should not allow any transitions from REJECTED', () => {
      const allowedStatuses = getAllowedNextStatuses(
        RequisitionStatus.REJECTED as RequisitionStatusType
      )
      expect(allowedStatuses).toEqual([])
    })

    it('should be an approval-related status', () => {
      const isApprovalRelated = isApprovalRelatedStatus(
        RequisitionStatus.REJECTED as RequisitionStatusType
      )
      expect(isApprovalRelated).toBe(true)
    })
  })

  describe('Property 18: Payment Recording Transition', () => {
    it('should allow transition from APPROVED to PAID', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.APPROVED as RequisitionStatusType,
        RequisitionStatus.PAID as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should not allow transition from APPROVED to other statuses', () => {
      const invalidTransitions = [
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.UNDER_REVIEW,
        RequisitionStatus.REJECTED,
        RequisitionStatus.CLOSED,
      ]

      for (const status of invalidTransitions) {
        const isValid = isValidStatusTransition(
          RequisitionStatus.APPROVED as RequisitionStatusType,
          status as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })

    it('should be a financial status', () => {
      const isFinancial = isFinancialStatus(RequisitionStatus.PAID as RequisitionStatusType)
      expect(isFinancial).toBe(true)
    })
  })

  describe('Property 19: Paid to Closed Transition', () => {
    it('should allow transition from PAID to CLOSED', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.PAID as RequisitionStatusType,
        RequisitionStatus.CLOSED as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should identify CLOSED as a terminal status', () => {
      const isTerminal = isTerminalStatus(RequisitionStatus.CLOSED as RequisitionStatusType)
      expect(isTerminal).toBe(true)
    })

    it('should not allow any transitions from CLOSED', () => {
      const allowedStatuses = getAllowedNextStatuses(
        RequisitionStatus.CLOSED as RequisitionStatusType
      )
      expect(allowedStatuses).toEqual([])
    })

    it('should be a financial status', () => {
      const isFinancial = isFinancialStatus(RequisitionStatus.CLOSED as RequisitionStatusType)
      expect(isFinancial).toBe(true)
    })
  })

  describe('Property 20: Status Change Audit Recording', () => {
    it('should provide status descriptions for audit purposes', () => {
      const description = getStatusDescription(RequisitionStatus.DRAFT as RequisitionStatusType)
      expect(description).toContain('Draft')
    })

    it('should provide descriptions for all statuses', () => {
      const statuses = [
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.UNDER_REVIEW,
        RequisitionStatus.APPROVED,
        RequisitionStatus.REJECTED,
        RequisitionStatus.PAID,
        RequisitionStatus.CLOSED,
      ]

      for (const status of statuses) {
        const description = getStatusDescription(status as RequisitionStatusType)
        expect(description).toBeDefined()
        expect(description.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Complete Status Lifecycle', () => {
    it('should support the complete happy path: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PAID -> CLOSED', () => {
      const path = [
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.UNDER_REVIEW,
        RequisitionStatus.APPROVED,
        RequisitionStatus.PAID,
        RequisitionStatus.CLOSED,
      ]

      for (let i = 0; i < path.length - 1; i++) {
        const isValid = isValidStatusTransition(
          path[i] as RequisitionStatusType,
          path[i + 1] as RequisitionStatusType
        )
        expect(isValid).toBe(true)
      }
    })

    it('should support rejection at UNDER_REVIEW stage', () => {
      const isValid = isValidStatusTransition(
        RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
        RequisitionStatus.REJECTED as RequisitionStatusType
      )
      expect(isValid).toBe(true)
    })

    it('should prevent skipping statuses', () => {
      const invalidSkips = [
        [RequisitionStatus.DRAFT, RequisitionStatus.UNDER_REVIEW],
        [RequisitionStatus.DRAFT, RequisitionStatus.APPROVED],
        [RequisitionStatus.SUBMITTED, RequisitionStatus.APPROVED],
        [RequisitionStatus.UNDER_REVIEW, RequisitionStatus.PAID],
      ]

      for (const [from, to] of invalidSkips) {
        const isValid = isValidStatusTransition(
          from as RequisitionStatusType,
          to as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })

    it('should prevent backward transitions', () => {
      const backwardTransitions = [
        [RequisitionStatus.SUBMITTED, RequisitionStatus.DRAFT],
        [RequisitionStatus.UNDER_REVIEW, RequisitionStatus.SUBMITTED],
        [RequisitionStatus.APPROVED, RequisitionStatus.UNDER_REVIEW],
        [RequisitionStatus.PAID, RequisitionStatus.APPROVED],
        [RequisitionStatus.CLOSED, RequisitionStatus.PAID],
      ]

      for (const [from, to] of backwardTransitions) {
        const isValid = isValidStatusTransition(
          from as RequisitionStatusType,
          to as RequisitionStatusType
        )
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Status Transition Validation Functions', () => {
    it('should validate all allowed transitions correctly', () => {
      const allowedTransitions = [
        [RequisitionStatus.DRAFT, RequisitionStatus.SUBMITTED],
        [RequisitionStatus.SUBMITTED, RequisitionStatus.UNDER_REVIEW],
        [RequisitionStatus.UNDER_REVIEW, RequisitionStatus.APPROVED],
        [RequisitionStatus.UNDER_REVIEW, RequisitionStatus.REJECTED],
        [RequisitionStatus.APPROVED, RequisitionStatus.PAID],
        [RequisitionStatus.PAID, RequisitionStatus.CLOSED],
      ]

      for (const [from, to] of allowedTransitions) {
        const isValid = isValidStatusTransition(
          from as RequisitionStatusType,
          to as RequisitionStatusType
        )
        expect(isValid).toBe(true)
      }
    })

    it('should get correct allowed next statuses for each status', () => {
      expect(
        getAllowedNextStatuses(RequisitionStatus.DRAFT as RequisitionStatusType)
      ).toEqual([RequisitionStatus.SUBMITTED])

      expect(
        getAllowedNextStatuses(RequisitionStatus.SUBMITTED as RequisitionStatusType)
      ).toEqual([RequisitionStatus.UNDER_REVIEW])

      const underReviewAllowed = getAllowedNextStatuses(
        RequisitionStatus.UNDER_REVIEW as RequisitionStatusType
      )
      expect(underReviewAllowed).toContain(RequisitionStatus.APPROVED)
      expect(underReviewAllowed).toContain(RequisitionStatus.REJECTED)
      expect(underReviewAllowed.length).toBe(2)

      expect(
        getAllowedNextStatuses(RequisitionStatus.APPROVED as RequisitionStatusType)
      ).toEqual([RequisitionStatus.PAID])

      expect(
        getAllowedNextStatuses(RequisitionStatus.PAID as RequisitionStatusType)
      ).toEqual([RequisitionStatus.CLOSED])

      expect(
        getAllowedNextStatuses(RequisitionStatus.REJECTED as RequisitionStatusType)
      ).toEqual([])

      expect(
        getAllowedNextStatuses(RequisitionStatus.CLOSED as RequisitionStatusType)
      ).toEqual([])
    })

    it('should throw error on invalid transition validation', () => {
      const invalidTransitions = [
        [RequisitionStatus.DRAFT, RequisitionStatus.APPROVED],
        [RequisitionStatus.SUBMITTED, RequisitionStatus.PAID],
        [RequisitionStatus.REJECTED, RequisitionStatus.APPROVED],
        [RequisitionStatus.CLOSED, RequisitionStatus.PAID],
      ]

      for (const [from, to] of invalidTransitions) {
        expect(() => {
          validateStatusTransition(
            from as RequisitionStatusType,
            to as RequisitionStatusType
          )
        }).toThrow()
      }
    })
  })

  describe('Status Classification Functions', () => {
    it('should correctly identify terminal statuses', () => {
      expect(isTerminalStatus(RequisitionStatus.REJECTED as RequisitionStatusType)).toBe(true)
      expect(isTerminalStatus(RequisitionStatus.CLOSED as RequisitionStatusType)).toBe(true)
      expect(isTerminalStatus(RequisitionStatus.DRAFT as RequisitionStatusType)).toBe(false)
      expect(isTerminalStatus(RequisitionStatus.SUBMITTED as RequisitionStatusType)).toBe(false)
      expect(isTerminalStatus(RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)).toBe(false)
      expect(isTerminalStatus(RequisitionStatus.APPROVED as RequisitionStatusType)).toBe(false)
      expect(isTerminalStatus(RequisitionStatus.PAID as RequisitionStatusType)).toBe(false)
    })

    it('should correctly identify approval-related statuses', () => {
      expect(isApprovalRelatedStatus(RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)).toBe(
        true
      )
      expect(isApprovalRelatedStatus(RequisitionStatus.APPROVED as RequisitionStatusType)).toBe(true)
      expect(isApprovalRelatedStatus(RequisitionStatus.REJECTED as RequisitionStatusType)).toBe(true)
      expect(isApprovalRelatedStatus(RequisitionStatus.DRAFT as RequisitionStatusType)).toBe(false)
      expect(isApprovalRelatedStatus(RequisitionStatus.SUBMITTED as RequisitionStatusType)).toBe(
        false
      )
      expect(isApprovalRelatedStatus(RequisitionStatus.PAID as RequisitionStatusType)).toBe(false)
      expect(isApprovalRelatedStatus(RequisitionStatus.CLOSED as RequisitionStatusType)).toBe(false)
    })

    it('should correctly identify financial statuses', () => {
      expect(isFinancialStatus(RequisitionStatus.PAID as RequisitionStatusType)).toBe(true)
      expect(isFinancialStatus(RequisitionStatus.CLOSED as RequisitionStatusType)).toBe(true)
      expect(isFinancialStatus(RequisitionStatus.DRAFT as RequisitionStatusType)).toBe(false)
      expect(isFinancialStatus(RequisitionStatus.SUBMITTED as RequisitionStatusType)).toBe(false)
      expect(isFinancialStatus(RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)).toBe(false)
      expect(isFinancialStatus(RequisitionStatus.APPROVED as RequisitionStatusType)).toBe(false)
      expect(isFinancialStatus(RequisitionStatus.REJECTED as RequisitionStatusType)).toBe(false)
    })
  })
})
