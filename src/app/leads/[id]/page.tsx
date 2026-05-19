'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import LeadForm from '@/components/LeadForm'
import type { LeadFormLead } from '@/components/LeadForm'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Lead extends LeadFormLead {
  stage: string
  assignedUser: { name: string }
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<'view' | 'edit'>('view')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.replace('/login')
      setLoading(false)
      return
    }

    const parsedUser = JSON.parse(storedUser)
    if (parsedUser.role !== 'ADMIN') {
      router.replace('/pipeline')
      return
    }

    setUser(parsedUser)
    fetchLead()
  }, [params.id, router])

  const fetchLead = async () => {
    const res = await fetchWithAuth(`/api/leads/${params.id}`)
    const data = await res.json()
    if (res.ok) {
      setLead(data)
    } else {
      setLead(null)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!lead) return
    if (!confirm('Are you sure you want to delete this lead?')) return

    const res = await fetchWithAuth(`/api/leads/${lead.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Lead deleted successfully.')
      router.push('/leads')
      return
    }

    toast.error('Failed to delete lead.')
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  if (!lead) {
    return <div className="flex justify-center items-center min-h-screen">Lead not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/leads" className="text-xl font-bold text-gray-900">Leads</Link>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 sm:px-0 max-w-4xl mx-auto">
          <LeadForm
            onLeadAdded={() => {
              fetchLead()
              setFormMode('view')
            }}
            mode={formMode}
            lead={lead}
            onEditRequest={() => setFormMode('edit')}
            onCancel={() => setFormMode('view')}
          />
        </div>
      </div>
    </div>
  )
}
