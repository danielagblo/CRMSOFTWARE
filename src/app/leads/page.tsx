'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LeadForm from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

export default function LeadsPage() {
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      fetchLeads()
    }
  }, [])

  const fetchLeads = async () => {
    const res = await fetchWithAuth('/api/leads')
    const data = await res.json()
    setLeads(data)
  }

  const handleLeadAdded = () => {
    setShowForm(false)
    fetchLeads()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {showForm ? 'Cancel' : 'Add Lead'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <LeadForm onLeadAdded={handleLeadAdded} />
            </div>
          )}

          <LeadList leads={leads} onLeadUpdated={fetchLeads} />
        </div>
      </div>
    </div>
  )
}