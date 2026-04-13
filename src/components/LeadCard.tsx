'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Lead {
  id: string
  clientName: string
  phone: string
  dealValue: number | null
  assignedUser: { name: string }
  stage: string
}

interface LeadCardProps {
  lead: Lead
  onMoveToNext?: (leadId: string) => void
  onEditData?: (lead: Lead) => void
  onViewData?: (lead: Lead) => void
  onIssueInvoice?: (leadId: string) => void
  isIssuingInvoice?: boolean
  onDownloadInvoice?: (leadId: string) => void
  isDownloadingInvoice?: boolean
  hasStageData?: boolean
  isSelected?: boolean
  onToggleSelect?: (leadId: string) => void
  isDraggable?: boolean
  paymentSnapshot?: {
    agreedAmount: number
    totalPaid: number
    remainingBalance: number
  }
}

const stages = [
  'FIND_LEADS',
  'CONTACT_CLIENT',
  'CLOSE_DEAL',
  'PAYMENT',
  'CLIENT_RETENTION'
]

export default function LeadCard({
  lead,
  onMoveToNext,
  onEditData,
  onViewData,
  onIssueInvoice,
  isIssuingInvoice,
  onDownloadInvoice,
  isDownloadingInvoice,
  hasStageData,
  isSelected,
  onToggleSelect,
  isDraggable = true,
  paymentSnapshot
}: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, disabled: !isDraggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const currentStageIndex = stages.indexOf(lead.stage)
  const canMoveNext = currentStageIndex < stages.length - 1

  const handleMoveToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMoveToNext && canMoveNext) {
      onMoveToNext(lead.id)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open edit modal if not clicking on the next button
    if (onEditData && !e.defaultPrevented) {
      onEditData(lead)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 transform hover:-translate-y-1 ${isDraggable ? 'cursor-move' : 'cursor-default'
        } ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''
        }`}
      onClick={handleCardClick}
    >
      {/* Header with name and badges */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start gap-2 min-w-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect(lead.id)
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              title="Select lead for export"
            />
          )}
          <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
            {lead.clientName.charAt(0).toUpperCase()}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm truncate min-w-0 flex-1">{lead.clientName}</h3>
          {hasStageData && (
            <span className="shrink-0 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Has stage data">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Data
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {canMoveNext && (
            <button
              onClick={handleMoveToNext}
              className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              title={`Move to ${stages[currentStageIndex + 1].replace('_', ' ').toLowerCase()}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Next
            </button>
          )}
          {onViewData && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewData(lead)
              }}
              className="text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              title="View all stage data"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View
            </button>
          )}
          {lead.stage === 'PAYMENT' && onIssueInvoice && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onIssueInvoice(lead.id)
              }}
              disabled={isIssuingInvoice}
              className="text-xs bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 disabled:opacity-60 text-white px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              title="Issue invoice and send to client email"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h8l4 4v14H7V3z" />
              </svg>
              {isIssuingInvoice ? 'Issuing...' : 'Issue Invoice'}
            </button>
          )}
          {lead.stage === 'PAYMENT' && onDownloadInvoice && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownloadInvoice(lead.id)
              }}
              disabled={isDownloadingInvoice}
              className="text-xs bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:opacity-60 text-white px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md transform hover:scale-105"
              title="Download invoice document"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
              {isDownloadingInvoice ? 'Downloading...' : 'Download Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-gray-600 min-w-0">
          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="truncate">{lead.phone}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <span className="font-medium text-emerald-600">GHS {lead.dealValue?.toLocaleString() || '0'}</span>
        </div>
      </div>

      {lead.stage === 'PAYMENT' && paymentSnapshot && (
        <div className="mb-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Payment Progress</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-white p-2 border border-emerald-200">
              <p className="text-gray-500">Paid</p>
              <p className="font-bold text-emerald-700">GHS {paymentSnapshot.totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-white p-2 border border-amber-200">
              <p className="text-gray-500">Remaining</p>
              <p className="font-bold text-amber-700">GHS {paymentSnapshot.remainingBalance.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-600">
            Agreed Amount: <span className="font-semibold text-gray-800">GHS {paymentSnapshot.agreedAmount.toLocaleString()}</span>
          </p>
        </div>
      )}

      {/* Stage and Assignment */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${lead.stage === 'FIND_LEADS' ? 'bg-blue-100 text-blue-700' :
            lead.stage === 'CONTACT_CLIENT' ? 'bg-yellow-100 text-yellow-700' :
              lead.stage === 'CLOSE_DEAL' ? 'bg-green-100 text-green-700' :
                lead.stage === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-indigo-100 text-indigo-700'
          }`}>
          {lead.stage.replace(/_/g, ' ').toLowerCase()}
        </span>
        <div className="flex items-center text-xs text-gray-500">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate max-w-[10rem]">{lead.assignedUser.name}</span>
        </div>
      </div>

      {/* Edit hint */}
      {onEditData && (
        <div className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center justify-center py-1 px-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Click to edit stage data
        </div>
      )}
    </div>
  )
}