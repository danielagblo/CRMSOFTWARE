'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LeadForm from '@/components/LeadForm'
import type { LeadFormLead } from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import listIcon from '@/assets/list.svg'
import gridIcon from '@/assets/grid.svg'

interface Lead extends LeadFormLead {
  stage: string
  assignedUser: { name: string }
}

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [leadView, setLeadView] = useState<'list' | 'card'>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser.role !== 'ADMIN') {
        router.replace('/pipeline')
        return
      }
      setUser(parsedUser)
      fetchLeads()
    } else {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    setPendingEditId(editId)
    setIsFormOpen(true)
    setFormMode('edit')
  }, [searchParams])

  useEffect(() => {
    if (!pendingEditId) return
    const found = leads.find((lead) => lead.id === pendingEditId)
    if (!found) return
    setSelectedLead(found)
    setPendingEditId(null)
  }, [leads, pendingEditId])

  const fetchLeads = async () => {
    try {
      const res = await fetchWithAuth('/api/leads')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setLeads(data)
      } else {
        setLeads([])
      }
    } catch {
      setLeads([])
    }
  }

  const filteredLeads = useMemo(() => (
    leads.filter((lead) => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        lead.clientName.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(query)) ||
        (lead.notes && lead.notes.toLowerCase().includes(query)) ||
        lead.stage.toLowerCase().includes(query)
      )
    })
  ), [leads, searchQuery])

  const openCreateForm = () => {
    setFormMode('create')
    setSelectedLead(null)
    setIsFormOpen(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setFormMode('edit')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setSelectedLead(null)
    setFormMode('create')
    setIsFormOpen(false)
  }

  const handleLeadSaved = () => {
    fetchLeads()
    if (formMode === 'edit') {
      setSelectedLead(null)
      setFormMode('create')
    }
    if (window.innerWidth < 1280) {
      setIsFormOpen(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 sm:px-0">
          <PageHeader
            eyebrow="Lead Management"
            title="Leads"
            description={`Found ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}`}
            leftAction={(
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search leads..."
              />
            )}
            action={(
              <button
                onClick={() => (isFormOpen ? closeForm() : openCreateForm())}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {isFormOpen ? 'Close Form' : 'Add Lead'}
              </button>
            )}
          />

          <div className="flex justify-end mb-3">
            <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLeadView('list')}
                aria-pressed={leadView === 'list'}
                className={`rounded-md p-2 transition-colors cursor-pointer ${
                  leadView === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                <img src={listIcon.src} alt="List view" className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setLeadView('card')}
                aria-pressed={leadView === 'card'}
                className={`rounded-md p-2 transition-colors cursor-pointer ${
                  leadView === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                <img src={gridIcon.src} alt="Card view" className="h-6 w-6 cursor-pointer" />
              </button>
            </div>
          </div>

          <div className="xl:grid xl:grid-cols-12 xl:gap-6">
            <div className={isFormOpen ? 'xl:col-span-8' : 'xl:col-span-12'}>
              <div className="xl:hidden mb-4">
                {isFormOpen ? (
                  <LeadForm
                    onLeadAdded={handleLeadSaved}
                    mode={formMode}
                    lead={selectedLead}
                    onCancel={closeForm}
                  />
                ) : null}
              </div>
              <LeadList
                leads={filteredLeads}
                onLeadUpdated={fetchLeads}
                viewMode={leadView}
                onEditLead={handleEditLead}
              />
            </div>

            {isFormOpen ? (
              <aside className="hidden xl:block xl:col-span-4">
                <div className="sticky top-6">
                  <LeadForm
                    onLeadAdded={handleLeadSaved}
                    mode={formMode}
                    lead={selectedLead}
                    onCancel={closeForm}
                  />
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
