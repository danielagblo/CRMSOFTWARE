'use client'

import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

interface Lead {
  id: string
  clientName: string
  companyName: string | null
  phone: string
  email: string
  leadSource: string | null
  serviceType: string | null
  serviceCategory: string | null
  serviceInterested: string | null
  dealValue: number | null
  notes: string | null
  stage: string
  assignedTo: string
  visibleToAll?: boolean
  assignedUser: { name: string }
}

interface LeadListProps {
  leads: Lead[]
  onLeadUpdated: () => void
  viewMode: 'list' | 'card'
  onEditLead: (lead: Lead) => void
  onViewLead: (lead: Lead) => void
  onCreateLead: () => void
  selectedLeadId?: string | null
}

const parsePhoneNumbers = (phone: string) => (
  phone
    .split(/[\/,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
)

export default function LeadList({ leads, onLeadUpdated, viewMode, onEditLead, onViewLead, onCreateLead, selectedLeadId = null }: LeadListProps) {
  const [hoveredLead, setHoveredLead] = useState<Lead | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [hoverPreviewRef, setHoverPreviewRef] = useState<HTMLDivElement | null>(null)

  const clampToViewport = (x: number, y: number) => {
    const cardWidth = hoverPreviewRef?.offsetWidth || 320
    const cardHeight = hoverPreviewRef?.offsetHeight || 420
    const maxX = window.innerWidth - cardWidth - 12
    const maxY = window.innerHeight - cardHeight - 12

    return {
      x: Math.min(Math.max(x, 12), Math.max(12, maxX)),
      y: Math.min(Math.max(y, 12), Math.max(12, maxY))
    }
  }

  useEffect(() => {
    if (!hoverPreviewRef || typeof window === 'undefined') return
    setHoverPosition((prev) => clampToViewport(prev.x, prev.y))
  }, [hoverPreviewRef])

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': JSON.parse(localStorage.getItem('user') || '{}')?.id,
        }
      });
      if (res.ok) {
        onLeadUpdated();
      } else {
        alert('Failed to delete lead');
      }
    } catch (e) {
      alert('Error deleting lead');
    }
  };

  const stageLabels = {
    FIND_LEADS: 'Find Leads',
    CONTACT_CLIENT: 'Contact Client',
    PRESENT_SERVICE: 'Present Service',
    NEGOTIATE: 'Negotiate',
    CLOSE_DEAL: 'Close Deal',
    PAYMENT: 'Payment',
    CLIENT_RETENTION: 'Client Retention'
  }

  const updateHoverPosition = (event: MouseEvent) => {
    const offset = 16
    let x = event.clientX + offset
    let y = event.clientY + offset

    if (typeof window !== 'undefined') {
      const clamped = clampToViewport(x, y)
      x = clamped.x
      y = clamped.y
    }

    setHoverPosition({ x, y })
  }

  const renderLeadActions = (lead: Lead) => (
    <div
      data-actions="true"
      className="flex items-center gap-4"
      onMouseEnter={() => setHoveredLead(null)}
      onMouseLeave={() => setHoveredLead(null)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onViewLead(lead)
        }}
        className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold"
      >
        View
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onEditLead(lead)
        }}
        className="text-green-600 hover:text-green-900 text-sm font-semibold"
      >
        Edit
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation()
          handleDelete(lead.id)
        }}
        className="text-red-600 hover:text-red-900 text-sm font-semibold"
      >
        Delete
      </button>
    </div>
  )

  const renderLeadCard = (lead: Lead, variant: 'grid' | 'hover') => {
    const phoneNumbers = parsePhoneNumbers(lead.phone)
    const isSelected = selectedLeadId === lead.id
    const dealValue = lead.dealValue === null || lead.dealValue === undefined
      ? '-'
      : `GHS ${Number(lead.dealValue).toLocaleString()}`

    return (
      <div
        onClick={() => {
          if (variant === 'grid') {
            onViewLead(lead)
          }
        }}
        className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
          variant === 'grid'
            ? `w-full hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer ${isSelected ? 'xl:border-indigo-500 xl:ring-1 xl:ring-indigo-200' : ''}`
            : 'w-[min(90vw,24rem)] shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {lead.clientName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">{lead.clientName}</div>
              <div className="text-sm text-gray-500">{lead.companyName || '-'}</div>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 whitespace-nowrap rounded-sm bg-indigo-100 text-indigo-700">
            {stageLabels[lead.stage as keyof typeof stageLabels] || lead.stage}
          </span>
        </div>

        <div className="mt-3 space-y-2 text-sm mb-2 text-gray-700">
          <div>
            <span className="font-bold inline">Phone:</span>
            <div className="mt-1 space-y-1 inline">
              {phoneNumbers.length > 0 ? (
                phoneNumbers.map((number, index) => (
                  <div key={`${lead.id}-phone-${index}`} className="text-gray-700 inline ml-1">
                    {number}
                  </div>
                ))
              ) : (
                <div className="text-gray-700">-</div>
              )}
            </div>
          </div>
          <div><span className="font-bold">Email:</span> {lead.email || '-'}</div>
          <div><span className="font-bold">Stage:</span> {stageLabels[lead.stage as keyof typeof stageLabels] || lead.stage}</div>
          <div><span className="font-bold">Lead Source:</span> {lead.leadSource || '-'}</div>
          <div><span className="font-bold">Service Type:</span> {lead.serviceType || '-'}</div>
          <div><span className="font-bold">Service Category:</span> {lead.serviceCategory || '-'}</div>
          <div><span className="font-bold">Service Interested:</span> {lead.serviceInterested || '-'}</div>
          <div><span className="font-bold">Deal Value:</span> {dealValue}</div>
          <div><span className="font-bold">Assigned To:</span> {lead.assignedUser?.name || '-'}</div>
          <div className="whitespace-pre-wrap"><span className="font-bold">Notes:</span> {lead.notes || '-'}</div>
        </div>

        {variant === 'grid' ? (
          <div className="flex justify-end">
            <div className="mt-3 ">
              {renderLeadActions(lead)}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-right italic text-sm text-violet-600">
            Click to view details
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {leads.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No leads yet</p>
          <button
            type="button"
            onClick={onCreateLead}
            className="mt-1 text-sm text-gray-500 transition hover:underline hover:text-indigo-600"
          >
            Create your first lead to start tracking your pipeline.
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div>
          <div   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <div key={lead.id}>
                {renderLeadCard(lead, 'grid')}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div  className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded-xl">
          <ul className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const phoneNumbers = parsePhoneNumbers(lead.phone)
              const isSelected = selectedLeadId === lead.id
              return (
                <li
                  key={lead.id}
                  onClick={() => onViewLead(lead)}
                  className="cursor-pointer"
                  onMouseEnter={(event) => {
                    const target = event.target as HTMLElement
                    if (target.closest('[data-actions]')) {
                      setHoveredLead(null)
                      return
                    }
                    setHoveredLead(lead)
                    updateHoverPosition(event)
                  }}
                  onMouseMove={(event) => {
                    const target = event.target as HTMLElement
                    if (target.closest('[data-actions]')) {
                      setHoveredLead(null)
                      return
                    }
                    setHoveredLead(lead)
                    updateHoverPosition(event)
                  }}
                  onMouseLeave={() => setHoveredLead(null)}
                >
                  <div className={`px-4 py-5 sm:px-6 transition-colors ${
                    isSelected
                      ? 'hover:bg-indigo-50/60 xl:border xl:border-indigo-500 xl:bg-indigo-50/40'
                      : 'hover:bg-gray-50 xl:border xl:border-transparent'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center min-w-0">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {lead.clientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{lead.clientName}</div>
                          {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {phoneNumbers.length > 0 ? (
                          phoneNumbers.map((number, index) => (
                            <span key={`${lead.id}-list-phone-${index}`} className="text-sm font-medium px-2.5 py-1 rounded-sm bg-gray-200 text-gray-900">
                              {number}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-medium px-2.5 py-1 rounded-sm bg-gray-200 text-gray-900">-</span>
                        )}
                        <span className="text-sm font-medium px-2.5 py-1 rounded-sm bg-indigo-100 text-indigo-700">
                          {stageLabels[lead.stage as keyof typeof stageLabels] || lead.stage}
                        </span>
                        {renderLeadActions(lead)}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {hoveredLead && (
            <div
              ref={setHoverPreviewRef}
              className="pointer-events-none fixed z-50"
              style={{ left: hoverPosition.x, top: hoverPosition.y }}
            >
              <div className="max-h-[calc(100vh-24px)] overflow-auto">
                {renderLeadCard(hoveredLead, 'hover')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
