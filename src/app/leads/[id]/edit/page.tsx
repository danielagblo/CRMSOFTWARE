'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

const leadSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  companyName: z.string().optional(),
  leadSource: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.union([z.literal(''), z.string().email('Invalid email')]).optional(),
  serviceType: z.string().optional(),
  serviceCategory: z.string().optional(),
  serviceInterested: z.string().optional(),
  dealValue: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional()
})

type LeadFormData = z.infer<typeof leadSchema>

const serviceTypeOptions = [
  'Website', 'Mobile App', 'Web Application', 'E-commerce Store',
  'CRM / ERP Solution', 'UI/UX Design', 'Digital Marketing', 'Consulting', 'Other'
]

const serviceCategoryOptions = [
  'Startup', 'Small Business', 'Enterprise', 'E-commerce', 'Education',
  'Healthcare', 'Finance', 'Real Estate', 'Hospitality', 'NGO / Non-profit',
  'Government', 'Other'
]

const leadSourceOptions = [
  'Website',
  'Referral',
  'Social Media',
  'Sticker/Banner Advertising',
  'Cold Call',
  'Email Campaign',
  'Trade Show',
  'Walk-in',
  'Other'
]

export default function EditLeadPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema)
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.replace('/login')
      return
    }
    const parsedUser = JSON.parse(storedUser)
    if (parsedUser.role !== 'ADMIN') {
      router.replace('/pipeline')
      return
    }

    setUser(parsedUser)
    fetchUsers()

    if (params.id) {
      fetchLead()
    }
  }, [params.id, router])

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchLead = async () => {
    try {
      const res = await fetchWithAuth(`/api/leads/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        reset({
          clientName: data.clientName || '',
          companyName: data.companyName || '',
          leadSource: data.leadSource || '',
          phone: data.phone || '',
          email: data.email || '',
          serviceType: data.serviceType || '',
          serviceCategory: data.serviceCategory || '',
          serviceInterested: data.serviceInterested || '',
          dealValue: data.dealValue ? String(data.dealValue) : '',
          notes: data.notes || '',
          assignedTo: data.assignedTo || ''
        })
      } else {
        alert('Failed to load lead')
        router.push('/leads')
      }
    } catch (error) {
      console.error('Error loading lead', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LeadFormData) => {
    setSaving(true)
    try {
      const res = await fetchWithAuth(`/api/leads/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })

      if (res.ok) {
        router.push(`/leads/${params.id}`)
      } else {
        alert('Error updating lead')
      }
    } catch (error) {
      alert('Error updating lead')
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  if (!user) return null

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href={`/leads/${params.id}`} className="text-xl font-bold text-gray-900">Back to Lead</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">Edit Lead</h3>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Client Name *</label>
                <input {...register('clientName')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
                {errors.clientName && <p className="text-red-500 text-sm">{errors.clientName.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input {...register('companyName')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone *</label>
                <input {...register('phone')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input {...register('email')} type="email" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <select {...register('serviceType')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select service type</option>
                  {serviceTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Service Category</label>
                <select {...register('serviceCategory')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select category</option>
                  {serviceCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Lead Source</label>
                <select {...register('leadSource')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select lead source</option>
                  {leadSourceOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Deal Value (GHS)</label>
                <input {...register('dealValue')} type="number" step="0.01" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Service Notes</label>
                <input {...register('serviceInterested')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              {isAdmin && (
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Assign To</label>
                  <select {...register('assignedTo')} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="">Maintain current assignee</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea {...register('notes')} rows={4} className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
