'use client'

import Link from 'next/link'

interface Lead {
  id: string
  clientName: string
  companyName: string | null
  phone: string
  email: string
  dealValue: number | null
  stage: string
  assignedUser: { name: string }
}

interface LeadListProps {
  leads: Lead[]
  onLeadUpdated: () => void
}

export default function LeadList({ leads, onLeadUpdated }: LeadListProps) {
  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': JSON.parse(localStorage.getItem('user') || '{}')?.id,
        }
      });
      if (res.ok) {
        onLeadUpdated();
      } else {
        alert('Failed to delete lead');
      }
    } catch (e) {
      alert('Error deleting lead');
    }
  };

  const stageLabels = {
    FIND_LEADS: 'Find Leads',
    CONTACT_CLIENT: 'Contact Client',
    CLOSE_DEAL: 'Close Deal',
    PAYMENT: 'Payment',
    CLIENT_RETENTION: 'Client Retention'
  }

  return (
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded-xl">
      {leads.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No leads yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first lead to start tracking your pipeline.</p>
        </div>
      ) : (
      <ul className="divide-y divide-gray-100">
        {leads.map((lead) => (
          <li key={lead.id}>
            <div className="px-4 py-5 sm:px-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center min-w-0">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {lead.clientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{lead.clientName}</div>
                    <div className="text-sm text-gray-500 truncate">{lead.email}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{lead.phone}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    GHS {Number(lead.dealValue || 0).toLocaleString()}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    {stageLabels[lead.stage as keyof typeof stageLabels] || 'Contact Client'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {lead.assignedUser.name}
                  </span>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="text-red-600 hover:text-red-900 text-sm font-semibold ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}