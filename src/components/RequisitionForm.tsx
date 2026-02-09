'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useCSRFToken, addCSRFTokenToRequest } from '@/hooks/useCSRFToken'

interface RequisitionFormProps {
  initialData?: {
    id: string
    title: string
    category: string
    description: string
    estimatedCost: string | number
    currency: string
    urgencyLevel: string
    businessJustification: string
  }
  isEditing?: boolean
}

export function RequisitionForm({ initialData, isEditing = false }: RequisitionFormProps) {
  const router = useRouter()
  const csrfToken = useCSRFToken()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    estimatedCost: initialData?.estimatedCost?.toString() || '',
    currency: initialData?.currency || 'NGN',
    urgencyLevel: initialData?.urgencyLevel || 'MEDIUM',
    businessJustification: initialData?.businessJustification || '',
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = 'Title is required'
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required'
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    }
    if (!formData.estimatedCost) {
      errors.estimatedCost = 'Estimated cost is required'
    } else if (parseFloat(formData.estimatedCost) <= 0) {
      errors.estimatedCost = 'Estimated cost must be greater than 0'
    }
    if (!formData.businessJustification.trim()) {
      errors.businessJustification = 'Business justification is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const url = isEditing
        ? `/api/requisitions/${initialData?.id}`
        : '/api/requisitions'
      const method = isEditing ? 'PATCH' : 'POST'

      const requestOptions = addCSRFTokenToRequest(
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
        csrfToken
      )

      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save requisition')
      }

      const result = await response.json()
      setSuccess(true)
      setTimeout(() => {
        router.push(`/requisitions/${result.id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      // First save the requisition if it's new
      let requisitionId = initialData?.id
      if (!isEditing) {
        const createRequestOptions = addCSRFTokenToRequest(
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          },
          csrfToken
        )

        const createResponse = await fetch('/api/requisitions', createRequestOptions)

        if (!createResponse.ok) {
          const data = await createResponse.json()
          throw new Error(data.error || 'Failed to create requisition')
        }

        const created = await createResponse.json()
        requisitionId = created.id
      } else {
        // Update existing requisition
        const updateRequestOptions = addCSRFTokenToRequest(
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          },
          csrfToken
        )

        const updateResponse = await fetch(`/api/requisitions/${requisitionId}`, updateRequestOptions)

        if (!updateResponse.ok) {
          const data = await updateResponse.json()
          throw new Error(data.error || 'Failed to update requisition')
        }
      }

      // Submit the requisition
      const submitRequestOptions = addCSRFTokenToRequest(
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        csrfToken
      )

      const submitResponse = await fetch(`/api/requisitions/${requisitionId}/submit`, submitRequestOptions)

      if (!submitResponse.ok) {
        const data = await submitResponse.json()
        throw new Error(data.error || 'Failed to submit requisition')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/requisitions/${requisitionId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="space-y-6 max-w-2xl">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">
            {isEditing ? 'Requisition updated successfully!' : 'Requisition created successfully!'}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter requisition title"
        />
        {validationErrors.title && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.title}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validationErrors.category ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Office Supplies"
          />
          {validationErrors.category && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.category}</p>
          )}
        </div>

        <div>
          <label htmlFor="urgencyLevel" className="block text-sm font-medium text-gray-700 mb-1">
            Urgency Level *
          </label>
          <select
            id="urgencyLevel"
            name="urgencyLevel"
            value={formData.urgencyLevel}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Provide detailed description of what is needed"
        />
        {validationErrors.description && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="estimatedCost" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Cost *
          </label>
          <input
            type="number"
            id="estimatedCost"
            name="estimatedCost"
            value={formData.estimatedCost}
            onChange={handleInputChange}
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validationErrors.estimatedCost ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {validationErrors.estimatedCost && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.estimatedCost}</p>
          )}
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency *
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NGN">NGN - Nigerian Naira</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="businessJustification" className="block text-sm font-medium text-gray-700 mb-1">
          Business Justification *
        </label>
        <textarea
          id="businessJustification"
          name="businessJustification"
          value={formData.businessJustification}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.businessJustification ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Explain why this requisition is needed"
        />
        {validationErrors.businessJustification && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.businessJustification}</p>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Submit Requisition'}
        </button>
      </div>
    </form>
  )
}
