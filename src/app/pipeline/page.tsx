'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import LeadCard from '@/components/LeadCard'
import StageDataModal from '@/components/StageDataModal'
import LeadDataViewer from '@/components/LeadDataViewer'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead {
  id: string
  clientName: string
  phone: string
  email?: string | null
  companyName?: string | null
  dealValue: number | null
  assignedUser: { name: string }
  stage: string
}

interface PaymentSnapshot {
  agreedAmount: number
  totalPaid: number
  remainingBalance: number
  nextDuePaymentDate: string | null
  nextInstallmentNumber: number | null
}

interface StageDataEntry {
  id: string
  stage: string
  data: Record<string, any>
}

interface StageEditContext {
  lead: Lead
  stage: string
  stageDataId?: string
  initialData?: Record<string, any>
}

const stages = [
  'FIND_LEADS',
  'CONTACT_CLIENT',
  'CLOSE_DEAL',
  'PAYMENT',
  'CLIENT_RETENTION'
]

const legacyStageMap: Record<string, string> = {
  PRESENT_SERVICE: 'CONTACT_CLIENT',
  NEGOTIATE: 'CONTACT_CLIENT'
}

const stageLabels = {
  FIND_LEADS: 'Find Leads',
  CONTACT_CLIENT: 'Contact Client',
  CLOSE_DEAL: 'Close Deal',
  PAYMENT: 'Payment',
  CLIENT_RETENTION: 'Client Retention'
}

const normalizeLeadStage = (stage: string) => {
  if (stages.includes(stage)) return stage
  return legacyStageMap[stage] || 'FIND_LEADS'
}

function StageDropZone({
  stageId,
  children
}: {
  stageId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId })

  return (
    <div
      ref={setNodeRef}
      id={stageId}
      className={`h-full min-h-0 overflow-y-auto space-y-3 pr-1 rounded-md transition-colors ${
        isOver ? 'bg-white/70 ring-2 ring-indigo-300' : ''
      }`}
    >
      {children}
    </div>
  )
}

export default function PipelinePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [stageEditContext, setStageEditContext] = useState<StageEditContext | null>(null)
  const [dataViewerOpen, setDataViewerOpen] = useState(false)
  const [dataViewerLead, setDataViewerLead] = useState<Lead | null>(null)
  const [leadsWithData, setLeadsWithData] = useState<Set<string>>(new Set())
  const [issuingInvoiceLeadId, setIssuingInvoiceLeadId] = useState<string | null>(null)
  const [downloadingInvoiceLeadId, setDownloadingInvoiceLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentSnapshots, setPaymentSnapshots] = useState<Record<string, PaymentSnapshot>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      fetchLeads()
    } else {
      router.replace('/login')
      setLoading(false)
    }
  }, [router])

  const fetchLeads = async () => {
    try {
      const res = await fetchWithAuth('/api/leads')
      const data = await res.json()
      
      if (!res.ok || !Array.isArray(data)) {
        console.error('Failed to fetch leads:', data)
        setLeads([])
        setLoading(false)
        return
      }

      const normalizedLeads = data.map((lead) => ({
        ...lead,
        stage: normalizeLeadStage(lead.stage)
      }))
      setLeads(normalizedLeads)

      // Fetch stage data for all leads to determine which ones have data
      const leadsWithStageData = new Set<string>()
      const nextPaymentSnapshots: Record<string, PaymentSnapshot> = {}
      for (const lead of normalizedLeads) {
        try {
          const stageDataRes = await fetchWithAuth(`/api/stage-data?leadId=${lead.id}`)
          if (stageDataRes.ok) {
            const stageData = await stageDataRes.json()
            if (stageData.length > 0) {
              leadsWithStageData.add(lead.id)
            }

            const paymentEntries = stageData.filter((entry: StageDataEntry) => entry.stage === 'PAYMENT')
            const totalPaid = paymentEntries.reduce((sum: number, entry: StageDataEntry) => {
              const amount = Number(entry?.data?.amountReceived ?? entry?.data?.paymentAmount ?? 0)
              return Number.isFinite(amount) ? sum + amount : sum
            }, 0)
            const agreedAmount = Number(lead.dealValue || 0)
            const remainingBalance = Math.max(agreedAmount - totalPaid, 0)
            const latestPaymentEntry = paymentEntries[0]
            const nextDuePaymentDate = remainingBalance > 0
              ? (latestPaymentEntry?.data?.nextPaymentDate || latestPaymentEntry?.data?.paymentDueDate || null)
              : null
            const maxInstallmentNumber = paymentEntries.reduce((max: number, entry: StageDataEntry) => {
              const installment = Number(entry?.data?.installmentNumber)
              return Number.isInteger(installment) ? Math.max(max, installment) : max
            }, 0)
            nextPaymentSnapshots[lead.id] = {
              agreedAmount,
              totalPaid,
              remainingBalance,
              nextDuePaymentDate,
              nextInstallmentNumber: remainingBalance > 0 ? maxInstallmentNumber + 1 : null
            }
          }
        } catch (error) {
          console.error(`Error fetching stage data for lead ${lead.id}:`, error)
        }
      }
      setLeadsWithData(leadsWithStageData)
      setPaymentSnapshots(nextPaymentSnapshots)
    } catch (error) {
      console.error('Error in fetchLeads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    const lead = leads.find(l => l.id === (event.active.id as string))
    if (lead) setActiveStage(lead.stage)
  }

  const canMoveToStage = (currentStage: string, newStage: string) => {
    const isAdmin = user?.role === 'ADMIN'
    if (isAdmin) return true // Admins can move anywhere
    
    // Restrictions for sales reps
    const currentIndex = stages.indexOf(currentStage)
    const newIndex = stages.indexOf(newStage)
    
    // Allow moving backward to any previous stage, staying in the same stage,
    // or moving forward to the immediate next stage.
    return newIndex <= currentIndex + 1
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeLead = leads.find(lead => lead.id === activeId)
    const overLead = leads.find(lead => lead.id === overId)

    if (!activeLead) return

    // If dropping on a column header or empty space
    if (stages.includes(overId)) {
      const newStage = overId
      if (activeLead.stage !== newStage && canMoveToStage(activeLead.stage, newStage)) {
        setLeads(prev => prev.map(lead =>
          lead.id === activeId ? { ...lead, stage: newStage } : lead
        ))
      }
      return
    }

    // If dropping on another lead
    if (overLead) {
      if (activeLead.stage !== overLead.stage) {
        // Moving to a different column by hovering over another lead
        if (canMoveToStage(activeLead.stage, overLead.stage)) {
          setLeads(prev => prev.map(lead =>
            lead.id === activeId ? { ...lead, stage: overLead.stage } : lead
          ))
        }
      } else {
        // Reordering within the same column
        const activeIndex = leads.findIndex(lead => lead.id === activeId)
        const overIndex = leads.findIndex(lead => lead.id === overId)

        if (activeIndex !== overIndex) {
          setLeads(prev => arrayMove(prev, activeIndex, overIndex))
        }
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeLead = leads.find(lead => lead.id === activeId)
    if (!activeLead) return

    let newStage = activeLead.stage

    // If dropped on a stage column
    if (stages.includes(overId)) {
      newStage = overId
    } else {
      // If dropped on another lead, use that lead's stage
      const overLead = leads.find(lead => lead.id === overId)
      if (overLead) {
        newStage = overLead.stage
      }
    }

    // Only commit if the move is allowed and the stage actually changed
    if (activeStage && newStage !== activeStage && canMoveToStage(activeStage, newStage)) {
      // Update on server
      await fetchWithAuth(`/api/leads/${activeId}`, {
        method: 'PUT',
        body: JSON.stringify({ stage: newStage })
      })
    }
    setActiveStage(null)
  }

  const moveToNextStage = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    const currentIndex = stages.indexOf(lead.stage)
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1]

      // Update locally
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, stage: nextStage } : l
      ))

      // Update on server
      await fetchWithAuth(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ stage: nextStage })
      })
    }
  }

  const getLeadsByStage = (stage: string) => {
    const query = searchQuery.trim().toLowerCase()
    return leads.filter((lead) => {
      if (lead.stage !== stage) return false
      if (!query) return true

      const searchableFields = [
        lead.clientName,
        lead.phone,
        lead.email || '',
        lead.companyName || '',
        lead.assignedUser?.name || ''
      ]
      return searchableFields.some((value) => value.toLowerCase().includes(query))
    })
  }

  const handleEditLeadData = (lead: Lead) => {
    if (lead.stage === 'FIND_LEADS') return

    setStageEditContext({
      lead,
      stage: lead.stage
    })
    setModalOpen(true)
  }

  const handleViewLeadData = (lead: Lead) => {
    setDataViewerLead(lead)
    setDataViewerOpen(true)
  }

  const handleEditHistoryEntry = (lead: Lead, entry: StageDataEntry) => {
    setDataViewerOpen(false)
    setStageEditContext({
      lead,
      stage: entry.stage,
      stageDataId: entry.id,
      initialData: entry.data
    })
    setModalOpen(true)
  }

  const handleSaveStageData = async (leadId: string, payload: { stage: string; data: any; stageDataId?: string }) => {
    try {
      const response = await fetchWithAuth('/api/stage-data', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          stage: payload.stage,
          data: payload.data,
          stageDataId: payload.stageDataId
        })
      })

      const result = await response.json().catch(() => null)
      if (response.ok) {
        // Update the leadsWithData set to include this lead
        setLeadsWithData(prev => new Set([...prev, leadId]))

        // Special message for CLOSE_DEAL stage
        if (payload.stage === 'CLOSE_DEAL' && payload.data.contractValue) {
          alert(`Stage data saved successfully! Deal amount updated to GHS ${Number(payload.data.contractValue).toLocaleString()}`)
          // Refresh the leads to show updated dealValue
          fetchLeads()
        } else if (payload.stage === 'PAYMENT' && result?.paymentSummary) {
          alert(
            `Payment saved. Paid so far: GHS ${Number(result.paymentSummary.totalPaidToDate).toLocaleString()} / ` +
            `GHS ${Number(result.paymentSummary.agreedAmount).toLocaleString()} ` +
            `(Remaining: GHS ${Number(result.paymentSummary.remainingBalance).toLocaleString()})`
          )
          fetchLeads()
        } else {
          alert('Stage data saved successfully!')
        }
        return true
      } else {
        throw new Error(result?.error || 'Failed to save stage data')
      }
    } catch (error) {
      console.error('Error saving stage data:', error)
      const message = error instanceof Error ? error.message : 'Error saving stage data. Please try again.'
      alert(message)
      return false
    }
  }

  const handleIssueInvoice = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    const emailStr = window.prompt("Please enter the client's email address:", lead?.email || '')
    if (!emailStr) return

    setIssuingInvoiceLeadId(leadId)
    try {
      const response = await fetchWithAuth('/api/invoices/issue', {
        method: 'POST',
        body: JSON.stringify({ leadId, email: emailStr })
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to issue invoice')
      }

      alert(`Invoice issued successfully and sent to ${payload.clientEmail}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue invoice'
      alert(message)
    } finally {
      setIssuingInvoiceLeadId(null)
    }
  }

  const handleDownloadInvoice = async (leadId: string) => {
    setDownloadingInvoiceLeadId(leadId)
    try {
      const response = await fetchWithAuth(`/api/invoices/download?leadId=${encodeURIComponent(leadId)}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to download invoice')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const contentDisposition = response.headers.get('Content-Disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || 'invoice.doc'

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download invoice'
      alert(message)
    } finally {
      setDownloadingInvoiceLeadId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <div className="max-w-[1800px] mx-auto h-full py-4 px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, phone, email, company, or assignee..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 min-h-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {stages.map(stage => (
                <div key={stage} className="h-full min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 py-1">
                    <h2 className="text-base font-semibold text-gray-900">
                      {stageLabels[stage as keyof typeof stageLabels]}
                    </h2>
                    <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                      {getLeadsByStage(stage).length}
                    </span>
                  </div>
                  <StageDropZone stageId={stage}>
                    <SortableContext items={getLeadsByStage(stage).map(l => l.id)} strategy={verticalListSortingStrategy}>
                      {getLeadsByStage(stage).map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onMoveToNext={moveToNextStage}
                          onEditData={stage === 'FIND_LEADS' ? undefined : handleEditLeadData}
                          onViewData={handleViewLeadData}
                          onIssueInvoice={handleIssueInvoice}
                          isIssuingInvoice={issuingInvoiceLeadId === lead.id}
                          onDownloadInvoice={handleDownloadInvoice}
                          isDownloadingInvoice={downloadingInvoiceLeadId === lead.id}
                          hasStageData={leadsWithData.has(lead.id)}
                          isDraggable={true}
                          paymentSnapshot={paymentSnapshots[lead.id]}
                        />
                      ))}
                    </SortableContext>
                    {getLeadsByStage(stage).length === 0 && null}
                  </StageDropZone>
                </div>
              ))}
            </div>
          </DndContext>
        </div>
      </div>

      {stageEditContext && (
        <StageDataModal
          lead={stageEditContext.lead}
          stage={stageEditContext.stage}
          stageDataId={stageEditContext.stageDataId}
          initialData={stageEditContext.initialData}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setStageEditContext(null)
          }}
          onSave={handleSaveStageData}
        />
      )}

      {dataViewerLead && (
        <LeadDataViewer
          lead={dataViewerLead}
          isOpen={dataViewerOpen}
          onClose={() => setDataViewerOpen(false)}
          onEditEntry={handleEditHistoryEntry}
        />
      )}
    </div>
  )
}