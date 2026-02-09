'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Trash2, Edit2, Plus } from 'lucide-react'

interface ApprovalRule {
  id: string
  minAmount: string | number
  maxAmount: string | number | null
  requiredApprovers: string[]
  department?: {
    id: string
    name: string
  }
  departmentId: string | null
  createdAt: string
  updatedAt: string
}

interface Department {
  id: string
  name: string
}

const AVAILABLE_ROLES = ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN']

export function ApprovalRuleConfig() {
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    minAmount: '',
    maxAmount: '',
    requiredApprovers: [] as string[],
    departmentId: '',
  })

  useEffect(() => {
    fetchRules()
    fetchDepartments()
  }, [])

  const fetchRules = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/approval-rules')

      if (!response.ok) {
        throw new Error('Failed to fetch approval rules')
      }

      const data = await response.json()
      setRules(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      // Fetch departments from an endpoint or use a hardcoded list
      // For now, we'll assume departments are available
      setDepartments([])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.minAmount) {
      errors.minAmount = 'Minimum amount is required'
    } else if (parseFloat(formData.minAmount) < 0) {
      errors.minAmount = 'Minimum amount must be >= 0'
    }

    if (formData.maxAmount && parseFloat(formData.maxAmount) <= 0) {
      errors.maxAmount = 'Maximum amount must be > 0'
    }

    if (formData.maxAmount && parseFloat(formData.minAmount) > parseFloat(formData.maxAmount)) {
      errors.maxAmount = 'Maximum amount must be greater than minimum amount'
    }

    if (formData.requiredApprovers.length === 0) {
      errors.requiredApprovers = 'At least one approver role is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleApproverToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      requiredApprovers: prev.requiredApprovers.includes(role)
        ? prev.requiredApprovers.filter(r => r !== role)
        : [...prev.requiredApprovers, role],
    }))
    if (validationErrors.requiredApprovers) {
      setValidationErrors(prev => ({
        ...prev,
        requiredApprovers: '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setError(null)
    setSuccess(false)

    try {
      const payload = {
        minAmount: parseFloat(formData.minAmount),
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
        requiredApprovers: formData.requiredApprovers,
        departmentId: formData.departmentId || null,
      }

      const url = editingId ? `/api/approval-rules/${editingId}` : '/api/approval-rules'
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} approval rule`)
      }

      setSuccess(true)
      setShowForm(false)
      setEditingId(null)
      setFormData({
        minAmount: '',
        maxAmount: '',
        requiredApprovers: [],
        departmentId: '',
      })
      await fetchRules()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleEdit = (rule: ApprovalRule) => {
    setFormData({
      minAmount: rule.minAmount.toString(),
      maxAmount: rule.maxAmount ? rule.maxAmount.toString() : '',
      requiredApprovers: rule.requiredApprovers,
      departmentId: rule.departmentId || '',
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) return

    try {
      const response = await fetch(`/api/approval-rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete approval rule')
      }

      setSuccess(true)
      await fetchRules()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      minAmount: '',
      maxAmount: '',
      requiredApprovers: [],
      departmentId: '',
    })
    setValidationErrors({})
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(num)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading approval rules...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">Operation completed successfully!</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Approval Rules</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Approval Rule' : 'Create New Approval Rule'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Amount *
                </label>
                <input
                  type="number"
                  id="minAmount"
                  name="minAmount"
                  value={formData.minAmount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.minAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {validationErrors.minAmount && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.minAmount}</p>
                )}
              </div>

              <div>
                <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Amount (Optional)
                </label>
                <input
                  type="number"
                  id="maxAmount"
                  name="maxAmount"
                  value={formData.maxAmount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.maxAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Leave empty for no limit"
                />
                {validationErrors.maxAmount && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.maxAmount}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Required Approver Roles *
              </label>
              <div className="space-y-2">
                {AVAILABLE_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.requiredApprovers.includes(role)}
                      onChange={() => handleApproverToggle(role)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
              {validationErrors.requiredApprovers && (
                <p className="text-sm text-red-600 mt-2">{validationErrors.requiredApprovers}</p>
              )}
            </div>

            <div>
              <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
                Department (Optional - leave empty for all departments)
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No approval rules configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatCurrency(rule.minAmount)} - {rule.maxAmount ? formatCurrency(rule.maxAmount) : 'Unlimited'}
                    </h3>
                    {rule.department && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {rule.department.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600">Requires approval from:</p>
                    <div className="flex gap-2">
                      {rule.requiredApprovers.map(role => (
                        <span
                          key={role}
                          className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
