'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface AuditEntry {
  id: string
  changeType: string
  fieldName?: string
  previousValue?: string
  newValue?: string
  timestamp: string
  user?: {
    name: string
    email: string
  }
  metadata?: Record<string, any>
}

interface AuditTrailViewerProps {
  requisitionId: string
  isAdmin?: boolean
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800 border-blue-300',
  FIELD_UPDATED: 'bg-gray-100 text-gray-800 border-gray-300',
  STATUS_CHANGED: 'bg-purple-100 text-purple-800 border-purple-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  PAYMENT_RECORDED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ATTACHMENT_UPLOADED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  ATTACHMENT_DOWNLOADED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  NOTIFICATION_SENT: 'bg-pink-100 text-pink-800 border-pink-300',
}

const CHANGE_TYPE_ICONS: Record<string, string> = {
  CREATED: '✨',
  FIELD_UPDATED: '✏️',
  STATUS_CHANGED: '🔄',
  APPROVED: '✅',
  REJECTED: '❌',
  PAYMENT_RECORDED: '💰',
  ATTACHMENT_UPLOADED: '📤',
  ATTACHMENT_DOWNLOADED: '📥',
  NOTIFICATION_SENT: '📧',
}

export function AuditTrailViewer({ requisitionId, isAdmin = false }: AuditTrailViewerProps) {
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('ALL')

  useEffect(() => {
    fetchAuditTrail()
  }, [requisitionId])

  const fetchAuditTrail = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/audit-trail`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail')
      }
      const data = await response.json()
      setAuditTrail(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatValue = (value: string | undefined) => {
    if (!value) return 'N/A'
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2)
      }
      return String(parsed)
    } catch {
      return value
    }
  }

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const getChangeTypeLabel = (changeType: string) => {
    return changeType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const filteredTrail = filterType === 'ALL'
    ? auditTrail
    : auditTrail.filter(entry => entry.changeType === filterType)

  const changeTypes = Array.from(new Set(auditTrail.map(entry => entry.changeType)))

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading audit trail...</div>
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>
        <p className="text-sm text-gray-600 mb-4">
          Complete history of all changes to this requisition. Entries are immutable and recorded in chronological order.
        </p>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <label htmlFor="filter" className="text-sm font-medium text-gray-700">
            Filter by type:
          </label>
          <select
            id="filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Changes ({auditTrail.length})</option>
            {changeTypes.map(type => (
              <option key={type} value={type}>
                {getChangeTypeLabel(type)} ({auditTrail.filter(e => e.changeType === type).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Trail Entries */}
      {filteredTrail.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
          <p className="text-gray-500">No audit entries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrail.map((entry, index) => {
            const isExpanded = expandedEntries.has(entry.id)
            const colorClass = CHANGE_TYPE_COLORS[entry.changeType] || 'bg-gray-100 text-gray-800 border-gray-300'
            const icon = CHANGE_TYPE_ICONS[entry.changeType] || '📝'

            return (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Entry Header */}
                <button
                  onClick={() => toggleExpanded(entry.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    {/* Timeline Indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${colorClass} border`}>
                        {icon}
                      </div>
                      {index < filteredTrail.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-300 mt-1" />
                      )}
                    </div>

                    {/* Entry Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                          {getChangeTypeLabel(entry.changeType)}
                        </span>
                        {entry.fieldName && (
                          <span className="text-sm font-mono text-gray-600">
                            {entry.fieldName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatDate(entry.timestamp)}</span>
                        {entry.user && (
                          <span>
                            by <span className="font-medium text-gray-900">{entry.user.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button className="ml-4 p-1 text-gray-400 hover:text-gray-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </button>

                {/* Entry Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 space-y-4">
                    {/* Entry ID */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Entry ID</p>
                      <p className="text-sm font-mono text-gray-900 break-all">{entry.id}</p>
                    </div>

                    {/* User Info */}
                    {entry.user && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">User</p>
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{entry.user.name}</p>
                          <p className="text-gray-600">{entry.user.email}</p>
                        </div>
                      </div>
                    )}

                    {/* Change Details */}
                    {entry.fieldName && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Field</p>
                        <p className="text-sm font-mono text-gray-900">{entry.fieldName}</p>
                      </div>
                    )}

                    {/* Previous Value */}
                    {entry.previousValue && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Previous Value</p>
                        <div className="bg-white border border-gray-300 rounded p-3 text-sm font-mono text-gray-900 max-h-40 overflow-auto">
                          {formatValue(entry.previousValue)}
                        </div>
                      </div>
                    )}

                    {/* New Value */}
                    {entry.newValue && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">New Value</p>
                        <div className="bg-white border border-gray-300 rounded p-3 text-sm font-mono text-gray-900 max-h-40 overflow-auto">
                          {formatValue(entry.newValue)}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Additional Information</p>
                        <div className="bg-white border border-gray-300 rounded p-3 text-sm font-mono text-gray-900 max-h-40 overflow-auto">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Timestamp</p>
                      <p className="text-sm text-gray-900">{formatDate(entry.timestamp)}</p>
                    </div>

                    {/* Immutability Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-700">
                        ✓ This entry is immutable and cannot be modified or deleted.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">Change Type Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(CHANGE_TYPE_COLORS).map(([type, colorClass]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm border ${colorClass}`}>
                {CHANGE_TYPE_ICONS[type] || '📝'}
              </div>
              <span className="text-sm text-gray-700">{getChangeTypeLabel(type)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>About the Audit Trail:</strong> This immutable log records all changes to this requisition, including who made the change, what changed, when it occurred, and the previous and new values. Audit entries cannot be modified or deleted, ensuring compliance and accountability.
        </p>
      </div>
    </div>
  )
}
