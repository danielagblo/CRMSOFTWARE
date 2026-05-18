'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LeadForm from '@/components/LeadForm'
import type { LeadFormLead } from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import FormModal from '@/lib/formModal'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import listIcon from '@/assets/list.svg'
import gridIcon from '@/assets/grid.svg'

interface Lead extends LeadFormLead {
  stage: string
  assignedUser: { name: string }
}

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

const escapeCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return ''
  const normalized = String(value).replace(/"/g, '""')
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
}

export default function LeadsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [leadView, setLeadView] = useState<'list' | 'card'>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setFormMode('view')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setSelectedLead(null)
    setFormMode('create')
    setIsFormOpen(false)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleExportLeads = () => {
    if (filteredLeads.length === 0) {
      alert('There are no leads to export.')
      return
    }

    const headers = [
      'clientName',
      'companyName',
      'phone',
      'email',
      'leadSource',
      'serviceType',
      'serviceCategory',
      'serviceInterested',
      'dealValue',
      'notes',
      'stage',
      'assignedUser'
    ]

    const csvRows = [
      headers.join(','),
      ...filteredLeads.map((lead) => (
        [
          lead.clientName,
          lead.companyName,
          lead.phone,
          lead.email,
          lead.leadSource,
          lead.serviceType,
          lead.serviceCategory,
          lead.serviceInterested,
          lead.dealValue,
          lead.notes,
          lead.stage,
          lead.assignedUser?.name || ''
        ].map(escapeCsvValue).join(',')
      ))
    ]

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `leads-${date}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        alert('CSV must include a header row and at least one lead row.')
        return
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase())
      const indexOf = (names: string[]) => headers.findIndex((header) => names.includes(header))

      const fieldIndexes = {
        clientName: indexOf(['clientname', 'client_name', 'client name']),
        companyName: indexOf(['companyname', 'company_name', 'company name']),
        phone: indexOf(['phone', 'phone_number', 'phonenumber']),
        email: indexOf(['email', 'emailaddress', 'email_address']),
        leadSource: indexOf(['leadsource', 'lead_source', 'lead source']),
        serviceType: indexOf(['servicetype', 'service_type', 'service type']),
        serviceCategory: indexOf(['servicecategory', 'service_category', 'service category']),
        serviceInterested: indexOf(['serviceinterested', 'service_interested', 'service interested']),
        dealValue: indexOf(['dealvalue', 'deal_value', 'deal value']),
        notes: indexOf(['notes', 'note'])
      }

      if (fieldIndexes.clientName < 0 || fieldIndexes.phone < 0) {
        alert('CSV is missing required columns: clientName and phone.')
        return
      }

      let importedCount = 0
      let failedCount = 0

      for (const line of lines.slice(1)) {
        const values = parseCsvLine(line)
        const getValue = (key: keyof typeof fieldIndexes) => {
          const idx = fieldIndexes[key]
          return idx >= 0 ? (values[idx] || '').trim() : ''
        }

        const clientName = getValue('clientName')
        const phone = getValue('phone')

        if (!clientName || !phone) {
          failedCount += 1
          continue
        }

        const payload = {
          clientName,
          companyName: getValue('companyName'),
          phone,
          email: getValue('email'),
          leadSource: getValue('leadSource'),
          serviceType: getValue('serviceType'),
          serviceCategory: getValue('serviceCategory'),
          serviceInterested: getValue('serviceInterested'),
          dealValue: getValue('dealValue'),
          notes: getValue('notes')
        }

        const response = await fetchWithAuth('/api/leads', {
          method: 'POST',
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          importedCount += 1
        } else {
          failedCount += 1
        }
      }

      await fetchLeads()
      alert(`CSV import complete. Imported ${importedCount} lead(s), failed ${failedCount}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import CSV file.'
      alert(message)
    } finally {
      event.target.value = ''
    }
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
    <div className="min-h-screen bg-(--light-blue)/45">
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
                className="rounded-lg bg-(--dark-blue) px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-(--dark-blue)/85"
              >
                {isFormOpen ? 'Close Form' : 'Add Lead'}
              </button>
            )}
          />

          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />

          <div className="mb-3 -mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-lg border border-(--dark-blue) bg-white px-4 py-2.5 text-sm font-medium text-(--dark-blue) shadow-sm transition-colors hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleExportLeads}
              className="rounded-lg border border-(--dark-blue) bg-white px-4 py-2.5 text-sm font-medium text-(--dark-blue) shadow-sm transition-colors hover:bg-gray-50"
            >
              Export CSV
            </button>
            <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLeadView('list')}
                aria-pressed={leadView === 'list'}
                className={`rounded-md p-2 transition-colors cursor-pointer ${
                  leadView === 'list' ? 'bg-(--light-blue) text-indigo-600' : 'text-gray-500 hover:bg-(--light-blue)/45 hover:text-indigo-600'
                }`}
              >
                <img src={listIcon.src} alt="List view" className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setLeadView('card')}
                aria-pressed={leadView === 'card'}
                className={`rounded-md p-2 transition-colors cursor-pointer ${
                  leadView === 'card' ? 'bg-(--light-blue) text-indigo-600' : 'text-gray-500 hover:bg-(--light-blue)/45 hover:text-indigo-600'
                }`}
              >
                <img src={gridIcon.src} alt="Card view" className="h-6 w-6 cursor-pointer" />
              </button>
            </div>
          </div>

          <div className="xl:grid xl:grid-cols-12 xl:gap-6">
            <div className={`${isFormOpen ? 'xl:col-span-8' : 'xl:col-span-12'} 2xl:col-span-8`}>
              <LeadList
                leads={filteredLeads}
                onLeadUpdated={fetchLeads}
                viewMode={leadView}
                onEditLead={handleEditLead}
                onViewLead={handleViewLead}
                onCreateLead={openCreateForm}
                selectedLeadId={selectedLead?.id ?? null}
              />
            </div>

            <FormModal
              isOpen={isFormOpen}
              onClose={closeForm}
              title={""}
              wrapperClassName="xl:hidden"
            >
              <LeadForm
                onLeadAdded={handleLeadSaved}
                mode={formMode}
                lead={selectedLead}
                onCancel={closeForm}
                onEditRequest={() => setFormMode('edit')}
              />
            </FormModal>

            {isFormOpen ? (
              <aside className="hidden xl:block 2xl:hidden xl:col-span-4">
                <div className="sticky top-6">
                  <LeadForm
                    onLeadAdded={handleLeadSaved}
                    mode={formMode}
                    lead={selectedLead}
                    onCancel={closeForm}
                    onEditRequest={() => setFormMode('edit')}
                  />
                </div>
              </aside>
            ) : null}

            <aside className="hidden 2xl:block 2xl:col-span-4">
              <div className="sticky top-6">
                <LeadForm
                  onLeadAdded={handleLeadSaved}
                  mode={formMode}
                  lead={selectedLead}
                  onCancel={closeForm}
                  onEditRequest={() => setFormMode('edit')}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
