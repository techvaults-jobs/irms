import { z } from 'zod'
import { sanitizeString, sanitizeEmail } from './input-sanitization'

/**
 * Validation Schemas for all API inputs
 * Centralized validation using Zod for type safety and consistency
 * Includes XSS prevention through input sanitization
 */

// ============================================================================
// REQUISITION SCHEMAS
// ============================================================================

export const createRequisitionSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .transform(sanitizeString),
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category must be 100 characters or less')
    .transform(sanitizeString),
  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be 5000 characters or less')
    .transform(sanitizeString),
  estimatedCost: z.union([z.string(), z.number()])
    .refine(val => {
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num > 0
    }, 'Estimated cost must be a positive number'),
  currency: z.string()
    .min(1, 'Currency is required')
    .max(3, 'Currency must be 3 characters or less')
    .transform(sanitizeString)
    .default('USD'),
  urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .default('MEDIUM'),
  businessJustification: z.string()
    .min(1, 'Business justification is required')
    .max(5000, 'Business justification must be 5000 characters or less')
    .transform(sanitizeString),
})

export const updateRequisitionSchema = createRequisitionSchema.partial()

export const submitRequisitionSchema = z.object({
  // No additional fields required for submission
})

// ============================================================================
// APPROVAL WORKFLOW SCHEMAS
// ============================================================================

export const createApprovalRuleSchema = z.object({
  minAmount: z.union([z.string(), z.number()])
    .refine(val => {
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num >= 0
    }, 'Min amount must be a non-negative number'),
  maxAmount: z.union([z.string(), z.number()])
    .optional()
    .refine(val => {
      if (!val) return true
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num > 0
    }, 'Max amount must be a positive number'),
  requiredApprovers: z.array(z.string())
    .min(1, 'At least one approver role is required')
    .refine(arr => arr.every(role => ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN'].includes(role)),
      'Invalid approver role'),
  departmentId: z.string().optional(),
})

export const updateApprovalRuleSchema = createApprovalRuleSchema.partial()

export const approveRequisitionSchema = z.object({
  comment: z.string()
    .max(5000, 'Comment must be 5000 characters or less')
    .optional()
    .transform(val => val ? sanitizeString(val) : val),
  approvedCost: z.union([z.string(), z.number()])
    .optional()
    .refine(val => {
      if (!val) return true
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num > 0
    }, 'Approved cost must be a positive number'),
})

export const rejectRequisitionSchema = z.object({
  comment: z.string()
    .min(1, 'Rejection comment is required')
    .max(5000, 'Comment must be 5000 characters or less')
    .transform(sanitizeString),
})

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const paymentRecordingSchema = z.object({
  actualCostPaid: z.union([z.string(), z.number()])
    .refine(val => {
      const num = typeof val === 'string' ? parseFloat(val) : val
      return !isNaN(num) && num > 0
    }, 'Actual cost paid must be a positive number'),
  paymentDate: z.union([z.date(), z.string()])
    .refine(val => {
      const date = val instanceof Date ? val : new Date(val)
      return !isNaN(date.getTime())
    }, 'Payment date must be a valid date'),
  paymentMethod: z.string()
    .min(1, 'Payment method is required')
    .max(100, 'Payment method must be 100 characters or less')
    .transform(sanitizeString),
  paymentReference: z.string()
    .min(1, 'Payment reference is required')
    .max(255, 'Payment reference must be 255 characters or less')
    .transform(sanitizeString),
  paymentComment: z.string()
    .max(5000, 'Payment comment must be 5000 characters or less')
    .optional()
    .transform(val => val ? sanitizeString(val) : val),
  varianceThreshold: z.number()
    .min(0, 'Variance threshold must be non-negative')
    .max(1, 'Variance threshold must be between 0 and 1')
    .optional()
    .default(0.1),
})

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform(sanitizeEmail),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .transform(sanitizeString),
  departmentId: z.string()
    .min(1, 'Department ID is required'),
  role: z.enum(['STAFF', 'MANAGER', 'FINANCE', 'ADMIN'])
    .refine(role => role !== undefined, 'Role is required'),
})

export const updateUserSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .optional()
    .transform(val => val ? sanitizeString(val) : val),
  role: z.enum(['STAFF', 'MANAGER', 'FINANCE', 'ADMIN'])
    .optional(),
  departmentId: z.string()
    .min(1, 'Department ID is required')
    .optional(),
  isActive: z.boolean().optional(),
})

// ============================================================================
// ATTACHMENT SCHEMAS
// ============================================================================

export const attachmentUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size > 0, 'File is empty')
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be 10MB or less')
    .refine(file => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ]
      return allowedTypes.includes(file.type)
    }, 'File type not allowed'),
})

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  skip: z.union([z.string(), z.number()])
    .refine(val => {
      const num = typeof val === 'string' ? parseInt(val) : val
      return !isNaN(num) && num >= 0
    }, 'Skip must be a non-negative integer')
    .optional()
    .default(0),
  take: z.union([z.string(), z.number()])
    .refine(val => {
      const num = typeof val === 'string' ? parseInt(val) : val
      return !isNaN(num) && num > 0 && num <= 100
    }, 'Take must be between 1 and 100')
    .optional()
    .default(20),
})

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const requisitionFilterSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED'])
    .optional(),
  category: z.string().optional(),
  urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  departmentId: z.string().optional(),
  submitterId: z.string().optional(),
  skip: z.number().optional(),
  take: z.number().optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>
export type UpdateRequisitionInput = z.infer<typeof updateRequisitionSchema>
export type SubmitRequisitionInput = z.infer<typeof submitRequisitionSchema>

export type CreateApprovalRuleInput = z.infer<typeof createApprovalRuleSchema>
export type UpdateApprovalRuleInput = z.infer<typeof updateApprovalRuleSchema>
export type ApproveRequisitionInput = z.infer<typeof approveRequisitionSchema>
export type RejectRequisitionInput = z.infer<typeof rejectRequisitionSchema>

export type PaymentRecordingInput = z.infer<typeof paymentRecordingSchema>

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>

export type PaginationInput = z.infer<typeof paginationSchema>
export type RequisitionFilterInput = z.infer<typeof requisitionFilterSchema>
