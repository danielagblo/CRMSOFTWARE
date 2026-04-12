'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead {
  id: string
  clientName: string
  phone: string
  dealValue: number | null
  assignedUser: { name: string }
  stage: string
}

interface StageDataModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  stage?: string
  initialData?: Record<string, any>
  stageDataId?: string
  onSave: (leadId: string, payload: { stage: string; data: any; stageDataId?: string }) => Promise<boolean>
}

const stageFields = {
  FIND_LEADS: [],
  CONTACT_CLIENT: [
    { key: 'contactDate', label: 'Contact Date', type: 'date' },
    { key: 'contactMethod', label: 'Contact Method', type: 'select', options: ['Phone', 'Email', 'In-Person', 'Video Call', 'Text Message'] },
    { key: 'responseType', label: 'Response Type', type: 'select', options: ['Positive', 'Neutral', 'Negative', 'No Response'] },
    { key: 'contactNotes', label: 'Contact Notes', type: 'textarea' },
    { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }
  ],
  CLOSE_DEAL: [
    { key: 'closingDate', label: 'Expected Closing Date', type: 'date' },
    { key: 'finalTerms', label: 'Final Terms Agreed', type: 'textarea' },
    { key: 'contractValue', label: 'Contract Value (GHS)', type: 'number' },
    { key: 'paymentTerms', label: 'Payment Terms', type: 'text' },
    { key: 'specialConditions', label: 'Special Conditions', type: 'textarea' },
    { key: 'closingNotes', label: 'Closing Notes', type: 'textarea' }
  ],
  PAYMENT: [
    { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
    { key: 'invoiceNumber', label: 'Invoice Number', type: 'text' },
    { key: 'paymentDueDate', label: 'Payment Due Date', type: 'date' },
    { key: 'amountReceived', label: 'Amount Received (GHS)', type: 'number' },
    { key: 'nextPaymentDate', label: 'Next Payment Date', type: 'date' },
    { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Money', 'Credit Card'] },
    { key: 'paymentReference', label: 'Payment Reference', type: 'text' },
    { key: 'paymentNotes', label: 'Payment Notes', type: 'textarea' }
  ],
  CLIENT_RETENTION: [
    { key: 'onboardingDate', label: 'Onboarding Completion Date', type: 'date' },
    { key: 'satisfactionRating', label: 'Client Satisfaction (1-5)', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { key: 'retentionNotes', label: 'Retention Notes', type: 'textarea' },
    { key: 'followUpSchedule', label: 'Follow-up Schedule', type: 'text' },
    { key: 'upsellOpportunities', label: 'Upsell Opportunities', type: 'textarea' },
    { key: 'domainExpiryDate', label: 'Domain Expiry Date', type: 'date' },
    { key: 'serverExpiryDate', label: 'Server Expiry Date', type: 'date' }
  ]
}

export default function StageDataModal({ lead, isOpen, onClose, stage, initialData, stageDataId, onSave }: StageDataModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const activeStage = stage || lead.stage

  const draftStorageKey = useMemo(
    () => `stage-draft:${lead.id}:${activeStage}`,
    [lead.id, activeStage]
  )

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    const loadData = async () => {
      setIsLoading(true)
      try {
        const response = await fetchWithAuth(`/api/stage-data?leadId=${lead.id}&stage=${activeStage}`)
        const savedData = response.ok ? await response.json() : []
        const latestSaved = savedData?.[0]?.data ?? {}

        let draftData = {}
        const rawDraft = localStorage.getItem(draftStorageKey)
        if (rawDraft) {
          draftData = JSON.parse(rawDraft)
        }

        if (!cancelled) {
          // Draft takes precedence so users can continue unfinished edits.
          setFormData({ ...latestSaved, ...(initialData || {}), ...draftData })
        }
      } catch (error) {
        if (!cancelled) {
          setFormData({})
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [isOpen, lead.id, activeStage, draftStorageKey, initialData])

  if (!isOpen) return null

  const currentFields = stageFields[activeStage as keyof typeof stageFields] || []

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [key]: value
      }
      localStorage.setItem(draftStorageKey, JSON.stringify(next))
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const ok = await onSave(lead.id, { stage: activeStage, data: formData, stageDataId })
      if (ok) {
        localStorage.removeItem(draftStorageKey)
        onClose()
        setFormData({})
      }
    } finally {
      setIsSaving(false)
    }
  }

  const renderField = (field: any) => {
    const value = formData[field.key] || ''

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Update {lead.clientName} - {activeStage.replace('_', ' ').toLowerCase()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading saved stage data...</p>
          ) : null}
          {!isLoading && activeStage === 'PAYMENT' ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Payment totals are validated against the agreed close-deal amount. Add each installment as a separate payment entry.
            </p>
          ) : null}
          {!isLoading && currentFields.length === 0 ? (
            <p className="text-sm text-gray-500">No data entry fields for this stage.</p>
          ) : null}
          {currentFields.map((field: any) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}