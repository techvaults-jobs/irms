import { UserRole } from '@prisma/client'

export type Permission = 
  | 'create_requisition'
  | 'view_own_requisitions'
  | 'view_all_requisitions'
  | 'approve_requisition'
  | 'reject_requisition'
  | 'record_payment'
  | 'view_audit_trail'
  | 'manage_users'
  | 'manage_approval_rules'
  | 'generate_reports'
  | 'view_department_reports'
  | 'upload_attachments'
  | 'download_attachments'

export const rolePermissions: Record<UserRole, Permission[]> = {
  STAFF: [
    'create_requisition',
    'view_own_requisitions',
    'upload_attachments',
    'download_attachments',
  ],
  MANAGER: [
    'view_all_requisitions',
    'approve_requisition',
    'reject_requisition',
    'view_department_reports',
    'generate_reports',
    'download_attachments',
  ],
  FINANCE: [
    'view_all_requisitions',
    'record_payment',
    'view_audit_trail',
    'generate_reports',
    'download_attachments',
  ],
  ADMIN: [
    'create_requisition',
    'view_all_requisitions',
    'approve_requisition',
    'reject_requisition',
    'record_payment',
    'view_audit_trail',
    'manage_users',
    'manage_approval_rules',
    'generate_reports',
    'upload_attachments',
    'download_attachments',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

export const roleFeatures: Record<UserRole, string[]> = {
  STAFF: [
    'requisition_creation',
    'requisition_view_own',
    'attachment_upload',
    'attachment_download',
  ],
  MANAGER: [
    'requisition_view_all',
    'approval_queue',
    'department_reports',
    'attachment_download',
  ],
  FINANCE: [
    'requisition_view_all',
    'payment_recording',
    'audit_trail',
    'financial_reports',
    'attachment_download',
  ],
  ADMIN: [
    'requisition_creation',
    'requisition_view_all',
    'approval_queue',
    'payment_recording',
    'audit_trail',
    'user_management',
    'approval_rules',
    'all_reports',
    'attachment_upload',
    'attachment_download',
  ],
}

export function hasFeature(role: UserRole, feature: string): boolean {
  return roleFeatures[role]?.includes(feature) ?? false
}

/**
 * Check if a user can access a specific resource based on their role and department
 */
export function canAccessRequisition(
  userRole: UserRole,
  userDepartmentId: string,
  requisitionDepartmentId: string,
  requisitionSubmitterId: string,
  currentUserId: string
): boolean {
  // Admin can access all requisitions
  if (userRole === 'ADMIN') {
    return true
  }

  // Finance can access all requisitions
  if (userRole === 'FINANCE') {
    return true
  }

  // Manager can access requisitions from their department
  if (userRole === 'MANAGER') {
    return userDepartmentId === requisitionDepartmentId
  }

  // Staff can only access their own requisitions
  if (userRole === 'STAFF') {
    return currentUserId === requisitionSubmitterId
  }

  return false
}

/**
 * Check if a user can perform an action on a requisition
 */
export function canPerformAction(
  userRole: UserRole,
  action: 'approve' | 'reject' | 'record_payment' | 'view_audit' | 'manage_rules'
): boolean {
  const actionPermissions: Record<string, Permission[]> = {
    approve: ['approve_requisition'],
    reject: ['reject_requisition'],
    record_payment: ['record_payment'],
    view_audit: ['view_audit_trail'],
    manage_rules: ['manage_approval_rules'],
  }

  const requiredPermissions = actionPermissions[action] || []
  return hasAllPermissions(userRole, requiredPermissions)
}
