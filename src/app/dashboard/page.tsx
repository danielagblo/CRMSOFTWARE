'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface DashboardData {
  totalLeads: number
  leadsInProgress: number
  dealsClosed: number
  totalRevenue: number
  pipelineData: { stage: string; count: number }[]
}

interface ReminderItem {
  leadId: string
  clientName: string
  stage: string
  fieldKey: string
  fieldLabel: string
  dueDate: string
  status: 'OVERDUE' | 'TODAY' | 'UPCOMING'
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      fetchDashboardData()
    } else {
      router.replace('/login')
      setLoading(false)
    }
  }, [router])

  const fetchDashboardData = async () => {
    const [dashboardRes, remindersRes] = await Promise.all([
      fetchWithAuth('/api/dashboard'),
      fetchWithAuth('/api/reminders')
    ])

    const dashboardData = await dashboardRes.json()
    const remindersData = remindersRes.ok ? await remindersRes.json() : []

    setData(dashboardData)
    setReminders(remindersData)
    setLoading(false)
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

  const chartData = data?.pipelineData.map(item => ({
    stage: stageLabels[item.stage as keyof typeof stageLabels],
    count: item.count
  })) || []

  const formatReminderDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const getReminderBadgeClass = (status: ReminderItem['status']) => {
    if (status === 'OVERDUE') return 'bg-red-100 text-red-700'
    if (status === 'TODAY') return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <p className="text-sm font-medium text-indigo-600">Overview</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1>
            <p className="text-sm text-gray-500 mt-1">Track your pipeline progress, revenue, and upcoming follow-ups.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mb-6">
            <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl">
              <div className="p-5 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">L</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Leads
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {data?.totalLeads || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl">
              <div className="p-5 bg-gradient-to-r from-amber-50 to-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        In Progress
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {data?.leadsInProgress || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl">
              <div className="p-5 bg-gradient-to-r from-green-50 to-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">C</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Deals Closed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {data?.dealsClosed || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl">
              <div className="p-5 bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Revenue
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        GHS {data?.totalRevenue?.toFixed(2) || '0.00'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Pipeline Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-4">
                <Link href="/pipeline" className="block w-full bg-indigo-600 text-white text-center py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                  View Pipeline
                </Link>
                <Link href="/leads" className="block w-full bg-emerald-600 text-white text-center py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                  Manage Leads
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Reminders</h2>
              {reminders.length === 0 ? (
                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50">
                  No pending reminders yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {reminders.slice(0, 10).map((reminder, index) => (
                    <div key={`${reminder.leadId}-${reminder.fieldKey}-${reminder.dueDate}-${index}`} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-white to-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{reminder.clientName}</p>
                          <p className="text-xs text-gray-600">{reminder.fieldLabel}</p>
                          <p className="text-xs text-gray-500">{stageLabels[reminder.stage as keyof typeof stageLabels] || reminder.stage}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getReminderBadgeClass(reminder.status)}`}>
                          {reminder.status}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-gray-700">Due: {formatReminderDate(reminder.dueDate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}