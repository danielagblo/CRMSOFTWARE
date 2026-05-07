'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LeadForm from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead {
  id: string
  clientName: string
  companyName: string | null
  phone: string
  email: string
  stage: string
  dealValue: number | null
  notes: string | null
  assignedUser: { name: string }
}

export default function LeadsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

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

  const fetchLeads = async () => {
    try {
      const res = await fetchWithAuth('/api/leads')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setLeads(data)
      } else {
        setLeads([])
      }
    } catch (e) {
      setLeads([])
    }
  }

  const handleLeadAdded = () => {
    setShowForm(false)
    fetchLeads()
  }

  const filteredLeads = leads.filter(lead => {
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
            description={`${leads.length} total leads`}
            leftAction={
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search leads..."
              />
            }
            action={(
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {showForm ? 'Cancel' : 'Add Lead'}
              </button>
            )}
          />

          {showForm && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 mb-6">
              <LeadForm onLeadAdded={handleLeadAdded} />
            </div>
          )}

          <LeadList leads={filteredLeads} onLeadUpdated={fetchLeads} />
        </div>
      </div>
    </div>
  )
}
