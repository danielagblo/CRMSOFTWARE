'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead {
  id: string
  clientName: string
  companyName: string | null
  phone: string
  email: string
  serviceInterested: string | null
  dealValue: number | null
  notes: string | null
  stage: string
  assignedUser: { name: string }
  dateCreated: string
}

interface Activity {
  id: string
  type: string
  description: string
  date: string
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('NOTE')
  const [activityDescription, setActivityDescription] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchLead()
      fetchActivities()
    }
  }, [params.id])

  const fetchLead = async () => {
    const res = await fetchWithAuth(`/api/leads/${params.id}`)
    const data = await res.json()
    setLead(data)
    setLoading(false)
  }

  const fetchActivities = async () => {
    const res = await fetchWithAuth(`/api/activities?leadId=${params.id}`)
    const data = await res.json()
    setActivities(data)
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetchWithAuth('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        leadId: params.id,
        type: activityType,
        description: activityDescription
      })
    })

    if (res.ok) {
      setActivityDescription('')
      setShowActivityForm(false)
      fetchActivities()
    }
  }

  const stageLabels = {
    FIND_LEADS: 'Find Leads',
    CONTACT_CLIENT: 'Contact Client',
    PRESENT_SERVICE: 'Present Service',
    NEGOTIATE: 'Negotiate',
    CLOSE_DEAL: 'Close Deal',
    PAYMENT: 'Payment',
    CLIENT_RETENTION: 'Client Retention'
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!lead) {
    return <div className="flex justify-center items-center min-h-screen">Lead not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/leads" className="text-xl font-bold text-gray-900">Leads</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{lead.clientName}</h1>
            <p className="text-gray-600">{lead.companyName}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{lead.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{lead.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Interested</dt>
                  <dd className="text-sm text-gray-900">{lead.serviceInterested || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Deal Value</dt>
                  <dd className="text-sm text-gray-900">GHS {lead.dealValue || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Stage</dt>
                  <dd className="text-sm text-gray-900">{stageLabels[lead.stage as keyof typeof stageLabels]}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="text-sm text-gray-900">{lead.assignedUser.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date Created</dt>
                  <dd className="text-sm text-gray-900">{new Date(lead.dateCreated).toLocaleDateString()}</dd>
                </div>
              </dl>
              {lead.notes && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-900 mt-1">{lead.notes}</dd>
                </div>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Activities</h2>
                <button
                  onClick={() => setShowActivityForm(!showActivityForm)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
                >
                  Add Activity
                </button>
              </div>

              {showActivityForm && (
                <form onSubmit={handleAddActivity} className="mb-4 p-4 bg-gray-50 rounded">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="EMAIL">Email</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                      <option value="NOTE">Note</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(false)}
                      className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">{activity.type}</span>
                      <span className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{activity.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}