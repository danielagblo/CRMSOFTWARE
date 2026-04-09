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
  FIND_LEADS: [
    { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['Website', 'Referral', 'Social Media', 'Cold Call', 'Email Campaign', 'Trade Show', 'Sticker Marketing', 'Other'] },
    { key: 'initialContact', label: 'Initial Contact Method', type: 'select', options: ['Phone', 'Email', 'Website Form', 'Social Media', 'In-Person', 'Other'] },
    { key: 'leadQuality', label: 'Lead Quality', type: 'select', options: ['Hot', 'Warm', 'Cold'] },
    { key: 'discoveryNotes', label: 'Discovery Notes', type: 'textarea' }
  ],
  CONTACT_CLIENT: [
    { key: 'contactDate', label: 'Contact Date', type: 'date' },
    { key: 'contactMethod', label: 'Contact Method', type: 'select', options: ['Phone', 'Email', 'In-Person', 'Video Call', 'Text Message'] },
    { key: 'responseType', label: 'Response Type', type: 'select', options: ['Positive', 'Neutral', 'Negative', 'No Response'] },
    { key: 'contactNotes', label: 'Contact Notes', type: 'textarea' },
    { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }
  ],
  PRESENT_SERVICE: [
    { key: 'presentationDate', label: 'Presentation Date', type: 'date' },
    { key: 'presentationMethod', label: 'Presentation Method', type: 'select', options: ['In-Person', 'Video Call', 'Phone', 'Email', 'Demo'] },
    { key: 'clientNeedsSummary', label: 'Client Needs Summary', type: 'textarea' },
    { key: 'requiredFeatures', label: 'Required Features', type: 'textarea' },
    { key: 'mustHaveRequirements', label: 'Must-Have Requirements', type: 'textarea' },
    { key: 'niceToHaveRequirements', label: 'Nice-to-Have Requirements', type: 'textarea' },
    { key: 'technicalRequirements', label: 'Technical Requirements', type: 'textarea' },
    { key: 'integrationRequirements', label: 'Integration Requirements', type: 'textarea' },
    { key: 'timelineExpectation', label: 'Timeline Expectation', type: 'text' },
    { key: 'budgetExpectation', label: 'Budget Expectation (GHS)', type: 'number' },
    { key: 'successCriteria', label: 'Success Criteria', type: 'textarea' },
    { key: 'materialsUsed', label: 'Materials Used', type: 'text' },
    { key: 'clientInterest', label: 'Client Interest Level', type: 'select', options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'] },
    { key: 'presentationNotes', label: 'Presentation Notes', type: 'textarea' },
    { key: 'nextSteps', label: 'Next Steps', type: 'textarea' }
  ],
  NEGOTIATE: [
    { key: 'negotiationStartDate', label: 'Negotiation Start Date', type: 'date' },
    { key: 'keyObjections', label: 'Key Objections', type: 'textarea' },
    { key: 'proposedTerms', label: 'Proposed Terms', type: 'textarea' },
    { key: 'counteroffers', label: 'Counteroffers Made', type: 'textarea' },
    { key: 'negotiationStatus', label: 'Negotiation Status', type: 'select', options: ['Ongoing', 'Stalled', 'Agreement Reached', 'Terminated'] },
    { key: 'negotiationNotes', label: 'Negotiation Notes', type: 'textarea' }
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
    { key: 'paymentStatus', label: 'Payment Status', type: 'select', options: ['Pending', 'Partial Payment', 'Paid in Full', 'Overdue', 'Cancelled'] },
    { key: 'amountReceived', label: 'Amount Received (GHS)', type: 'number' },
    { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Money', 'Credit Card'] },
    { key: 'paymentNotes', label: 'Payment Notes', type: 'textarea' }
  ],
  CLIENT_RETENTION: [
    { key: 'onboardingDate', label: 'Onboarding Completion Date', type: 'date' },
    { key: 'satisfactionRating', label: 'Client Satisfaction (1-5)', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { key: 'retentionNotes', label: 'Retention Notes', type: 'textarea' },
    { key: 'followUpSchedule', label: 'Follow-up Schedule', type: 'text' },
    { key: 'upsellOpportunities', label: 'Upsell Opportunities', type: 'textarea' },
    { key: 'contractRenewalDate', label: 'Contract Renewal Date', type: 'date' }
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