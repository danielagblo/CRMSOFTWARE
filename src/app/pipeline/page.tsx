'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import Link from 'next/link'
import LeadCard from '@/components/LeadCard'
import StageDataModal from '@/components/StageDataModal'
import LeadDataViewer from '@/components/LeadDataViewer'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead {
  id: string
  clientName: string
  phone: string
  dealValue: number | null
  assignedUser: { name: string }
  stage: string
}

const stages = [
  'FIND_LEADS',
  'CONTACT_CLIENT',
  'PRESENT_SERVICE',
  'NEGOTIATE',
  'CLOSE_DEAL',
  'PAYMENT',
  'CLIENT_RETENTION'
]

const stageLabels = {
  FIND_LEADS: 'Find Leads',
  CONTACT_CLIENT: 'Contact Client',
  PRESENT_SERVICE: 'Present Service',
  NEGOTIATE: 'Negotiate',
  CLOSE_DEAL: 'Close Deal',
  PAYMENT: 'Payment',
  CLIENT_RETENTION: 'Client Retention'
}

const stageColors = {
  FIND_LEADS: 'bg-blue-50 border-blue-200',
  CONTACT_CLIENT: 'bg-yellow-50 border-yellow-200',
  PRESENT_SERVICE: 'bg-purple-50 border-purple-200',
  NEGOTIATE: 'bg-orange-50 border-orange-200',
  CLOSE_DEAL: 'bg-green-50 border-green-200',
  PAYMENT: 'bg-emerald-50 border-emerald-200',
  CLIENT_RETENTION: 'bg-indigo-50 border-indigo-200'
}

export default function PipelinePage() {
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [dataViewerOpen, setDataViewerOpen] = useState(false)
  const [dataViewerLead, setDataViewerLead] = useState<Lead | null>(null)
  const [leadsWithData, setLeadsWithData] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    const res = await fetchWithAuth('/api/leads')
    const data = await res.json()
    setLeads(data)

    // Fetch stage data for all leads to determine which ones have data
    const leadsWithStageData = new Set<string>()
    for (const lead of data) {
      try {
        const stageDataRes = await fetchWithAuth(`/api/stage-data?leadId=${lead.id}`)
        if (stageDataRes.ok) {
          const stageData = await stageDataRes.json()
          if (stageData.length > 0) {
            leadsWithStageData.add(lead.id)
          }
        }
      } catch (error) {
        console.error(`Error fetching stage data for lead ${lead.id}:`, error)
      }
    }
    setLeadsWithData(leadsWithStageData)
    setLoading(false)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
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

    // If dropping on a column header (stage name)
    if (stages.includes(overId)) {
      const newStage = overId
      if (activeLead.stage !== newStage) {
        setLeads(prev => prev.map(lead =>
          lead.id === activeId ? { ...lead, stage: newStage } : lead
        ))
      }
      return
    }

    // If dropping on another lead
    if (overLead && activeLead.stage === overLead.stage) {
      const activeIndex = leads.findIndex(lead => lead.id === activeId)
      const overIndex = leads.findIndex(lead => lead.id === overId)

      if (activeIndex !== overIndex) {
        setLeads(prev => arrayMove(prev, activeIndex, overIndex))
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

    if (newStage !== activeLead.stage) {
      // Update locally
      setLeads(prev => prev.map(lead =>
        lead.id === activeId ? { ...lead, stage: newStage } : lead
      ))

      // Update on server
      await fetch(`/api/leads/${activeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })
    }
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
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage })
      })
    }
  }

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.stage === stage)
  }

  const handleEditLeadData = (lead: Lead) => {
    setSelectedLead(lead)
    setModalOpen(true)
  }

  const handleViewLeadData = (lead: Lead) => {
    setDataViewerLead(lead)
    setDataViewerOpen(true)
  }

  const handleSaveStageData = async (leadId: string, data: any) => {
    try {
      const response = await fetchWithAuth('/api/stage-data', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          stage: selectedLead?.stage,
          data
        })
      })

      if (response.ok) {
        // Update the leadsWithData set to include this lead
        setLeadsWithData(prev => new Set([...prev, leadId]))

        // Special message for CLOSE_DEAL stage
        if (selectedLead?.stage === 'CLOSE_DEAL' && data.contractValue) {
          alert(`Stage data saved successfully! Deal amount updated to GHS ${Number(data.contractValue).toLocaleString()}`)
          // Refresh the leads to show updated dealValue
          fetchLeads()
        } else {
          alert('Stage data saved successfully!')
        }
      } else {
        throw new Error('Failed to save stage data')
      }
    } catch (error) {
      console.error('Error saving stage data:', error)
      alert('Error saving stage data. Please try again.')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
            <div className="text-sm text-gray-600">
              Total Leads: {leads.length}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4 lg:space-x-5 min-w-max">
                {stages.map(stage => (
                  <div key={stage} className="flex-shrink-0 w-72 lg:w-80 xl:w-96">
                    <div className={`rounded-lg border-2 p-4 ${stageColors[stage as keyof typeof stageColors]}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {stageLabels[stage as keyof typeof stageLabels]}
                        </h2>
                        <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                          {getLeadsByStage(stage).length}
                        </span>
                      </div>
                      <div
                        id={stage}
                        className="min-h-[500px] space-y-3"
                      >
                        <SortableContext items={getLeadsByStage(stage).map(l => l.id)} strategy={verticalListSortingStrategy}>
                          {getLeadsByStage(stage).map(lead => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              onMoveToNext={moveToNextStage}
                              onEditData={handleEditLeadData}
                              onViewData={handleViewLeadData}
                              hasStageData={leadsWithData.has(lead.id)}
                            />
                          ))}
                        </SortableContext>
                        {getLeadsByStage(stage).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">📋</div>
                            <p>No leads in this stage</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DndContext>
        </div>
      </div>

      {selectedLead && (
        <StageDataModal
          lead={selectedLead}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveStageData}
        />
      )}

      {dataViewerLead && (
        <LeadDataViewer
          lead={dataViewerLead}
          isOpen={dataViewerOpen}
          onClose={() => setDataViewerOpen(false)}
        />
      )}
    </div>
  )
}