'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LeadForm from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

export default function LeadsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      fetchLeads()
    } else {
      router.replace('/login')
    }
  }, [router])

  const fetchLeads = async () => {
    const res = await fetchWithAuth('/api/leads')
    const data = await res.json()
    setLeads(data)
  }

  const handleLeadAdded = () => {
    setShowForm(false)
    fetchLeads()
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-indigo-600">Lead Management</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leads</h1>
              <p className="text-sm text-gray-500 mt-1">{leads.length} total leads</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {showForm ? 'Cancel' : 'Add Lead'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 mb-6">
              <LeadForm onLeadAdded={handleLeadAdded} />
            </div>
          )}

          <LeadList leads={leads} onLeadUpdated={fetchLeads} />
        </div>
      </div>
    </div>
  )
}