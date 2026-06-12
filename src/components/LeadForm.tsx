'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useAuditLogger } from '@/components/AuditLoggerProvider'
import { useSiteSettings } from '@/components/SiteSettingsProvider'
import userIcon from '@/assets/user.svg'
import businessIcon from '@/assets/business.svg'
import phoneIcon from '@/assets/hash.svg'
import emailIcon from '@/assets/at-sign.svg'
import noteIcon from '@/assets/note.svg'
import filterIcon from '@/assets/filter.svg'
import DollarIcon from '@/assets/dollar.svg'

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

export interface LeadFormLead {
  id: string
  clientName: string
  companyName: string | null
  leadSource: string | null
  phone: string
  email: string
  serviceType: string | null
  serviceCategory: string | null
  serviceInterested: string | null
  dealValue: number | null
  notes: string | null
  assignedTo: string
  visibleToAll?: boolean
}

const serviceTypeOptions = [
  'Website',
  'Mobile App',
  'Web Application',
  'E-commerce Store',
  'CRM / ERP Solution',
  'UI/UX Design',
  'Digital Marketing',
  'Consulting',
  'Other'
]

const serviceCategoryOptions = [
  'Startup',
  'Small Business',
  'Enterprise',
  'E-commerce',
  'Education',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Hospitality',
  'NGO / Non-profit',
  'Government',
  'Other'
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

interface User {
  id: string
  name: string
  email: string
  role: string
}

type LeadFormMode = 'create' | 'edit' | 'view'

interface LeadFormProps {
  onLeadAdded: () => void
  mode?: LeadFormMode
  lead?: LeadFormLead | null
  onCancel?: () => void
  onEditRequest?: () => void
}

export default function LeadForm({
  onLeadAdded,
  mode = 'create',
  lead = null,
  onCancel,
  onEditRequest
}: LeadFormProps) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const { settings } = useSiteSettings()
  const { logAction } = useAuditLogger()
  const isReadOnly = mode === 'view'
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema)
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
      if (parsedUser?.role === 'ADMIN') {
        fetchUsers()
      }
    }
  }, [])

  useEffect(() => {
    if (lead) {
      reset({
        clientName: lead.clientName || '',
        companyName: lead.companyName || '',
        leadSource: lead.leadSource || '',
        phone: lead.phone || '',
        email: lead.email || '',
        serviceType: lead.serviceType || '',
        serviceCategory: lead.serviceCategory || '',
        serviceInterested: lead.serviceInterested || '',
        dealValue: lead.dealValue !== null && lead.dealValue !== undefined ? String(lead.dealValue) : '',
        notes: lead.notes || '',
        assignedTo: lead.visibleToAll ? '__ALL_USERS__' : (lead.assignedTo || '')
      })
      return
    }

    reset({
      clientName: '',
      companyName: '',
      leadSource: '',
      phone: '',
      email: '',
      serviceType: '',
      serviceCategory: '',
      serviceInterested: '',
      dealValue: '',
      notes: '',
      assignedTo: ''
    })
  }, [lead, reset])

  const isAdmin = user?.role === 'ADMIN'
  const iconFilter = settings.themeMode === 'dark' ? 'brightness(0) invert(1)' : 'none'

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

  const onSubmit = async (data: LeadFormData) => {
    if (isReadOnly) return
    setLoading(true)

    try {
      const isEdit = mode === 'edit' && lead?.id
      const endpoint = isEdit ? `/api/leads/${lead.id}` : '/api/leads'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(data)
      })

      if (res.ok) {
        const payload = await res.json().catch(() => null)
        if (!isEdit) {
          reset()
        }
        onLeadAdded()
        toast.success(isEdit ? 'Lead updated successfully.' : 'Lead added successfully.')
        await logAction({
          action: isEdit ? 'lead.update' : 'lead.create',
          entityType: 'lead',
          entityId: payload?.id || lead?.id,
          description: isEdit
            ? `Updated lead ${payload?.clientName || lead?.clientName || 'lead'}.`
            : `Created lead ${payload?.clientName || data.clientName}.`
        })
      } else {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.error || `Error ${isEdit ? 'updating' : 'adding'} lead`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Error ${mode === 'edit' ? 'updating' : 'adding'} lead`
      toast.error(message)
    }

    setLoading(false)
  }

  const onInvalid = (formErrors: FieldErrors<LeadFormData>) => {
    const firstError = Object.values(formErrors)[0]
    const message = firstError?.message ? String(firstError.message) : 'Please fix the highlighted fields.'
    toast.error(message)
  }

  const heading = useMemo(() => {
    if (mode === 'edit') {
      return {
        eyebrow: 'Edit Lead',
        title: lead?.clientName || 'Lead',
        description: 'Update lead details'
      }
    }
    if (mode === 'view') {
      return {
        eyebrow: 'Lead Details',
        title: lead?.clientName || 'Lead',
        description: 'Read-only view'
      }
    }
    return {
      eyebrow: '+ Add a New Lead',
      title: 'Leads',
      description: 'Enter client information to create a new lead'
    }
  }, [lead?.clientName, mode])

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm theme-surface">
      <div className="border-b theme-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--dark-brown)">{heading.eyebrow}</p>
        <h3 className="text-lg font-semibold theme-text">{heading.title}</h3>
        <p className="text-sm theme-text-muted">{heading.description}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-5 space-y-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">
                <span className="text-red-500 mr-1">*</span>
                Client Name
              </label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={userIcon.src} alt="Client name" />
                <input
                  {...register('clientName')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
              </div>
              {errors.clientName && (
                <p className="text-red-600 text-sm">{errors.clientName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Company Name</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={businessIcon.src} alt="Company name" />
                <input
                  {...register('companyName')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">
                <span className="text-red-500 mr-1">*</span>
                Phone
              </label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={phoneIcon.src} alt="Phone number" />
                <input
                  {...register('phone')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
              </div>
              {errors.phone && (
                <p className="text-red-600 text-sm">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Email (Optional)</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={emailIcon.src} alt="Email" />
                <input
                  {...register('email')}
                  type="email"
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Service Type</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={businessIcon.src} alt="Service type" />
                <select
                  {...register('serviceType')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                >
                  <option value="">Select service type</option>
                  {serviceTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Service Category</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={filterIcon.src} alt="Service category" />
                <select
                  {...register('serviceCategory')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                >
                  <option value="">Select category</option>
                  {serviceCategoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Lead Source</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={filterIcon.src} alt="Lead source" />
                <select
                  {...register('leadSource')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                >
                  <option value="">Select lead source</option>
                  {leadSourceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium theme-text">Deal Value (GHS)</label>
                <div className='relative'>
                  <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={DollarIcon.src} alt="Deal value" />
                  <input
                    {...register('dealValue')}
                    type="number"
                    step="0.01"
                    disabled={isReadOnly}
                    className="block w-full pl-12 pr-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                    style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                  />
                  </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium theme-text">Service Notes (Optional)</label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ filter: iconFilter }} src={noteIcon.src} alt="Service notes" />
                <input
                  {...register('serviceInterested')}
                  disabled={isReadOnly}
                  className="block w-full rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-1">
            <label className="block text-sm font-medium theme-text">Assign To</label>
            <select
              {...register('assignedTo')}
              disabled={isReadOnly}
              className="block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
              style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
            >
              <option value="">Select a user (leave empty to assign to yourself)</option>
              <option value="__ALL_USERS__">All Users</option>
              {users.map((listedUser) => (
                <option key={listedUser.id} value={listedUser.id}>
                  {listedUser.name} ({listedUser.email}) - {listedUser.role}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium theme-text">Additional Notes</label>
          <div className="relative">
            <img className="absolute left-3 top-3 h-5 w-5" style={{ filter: iconFilter }} src={noteIcon.src} alt="Additional notes" />
            <textarea
              {...register('notes')}
              rows={4}
              disabled={isReadOnly}
              className="block w-full resize-none rounded-lg border py-2 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
              style={{ background: 'var(--surface-muted)', borderColor: 'var(--surface-border)' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t theme-border pt-4">
          {onCancel && mode !== 'view' ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border w-1/2 border-(--dark-blue)/50 px-4 py-3 text-sm font-medium text-(--dark-blue) hover:bg-(--surface-muted)"
            >
              Cancel
            </button>
          ) : null}
          {mode === 'view' ? (
            <button
              type="button"
              onClick={onEditRequest}
              className="rounded-lg w-1/2 cursor-pointer bg-(--dark-blue) px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Edit
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg w-1/2 bg-(--dark-blue) px-5 py-3 text-sm cursor-pointer font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Lead')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
