/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import LeadForm from '@/components/LeadForm'
import type { LeadFormLead } from '@/components/LeadForm'
import LeadList from '@/components/LeadList'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import FormModal from '@/lib/formModal'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import listIcon from '@/assets/list.svg'
import gridIcon from '@/assets/grid.svg'
import { stages } from '@/lib/const'

interface Lead extends LeadFormLead {
  stage: string
  assignedUser: { name: string }
}

interface SavedLeadView {
  id: string
  name: string
  query: string
  viewMode: 'list' | 'card'
  createdAt: number
}

interface StoredUser {
  name?: string
  email?: string
  role?: string
}

interface CsvLeadRow {
  clientName: string
  companyName?: string
  leadSource?: string
  phone: string
  email?: string
  serviceType?: string
  serviceCategory?: string
  serviceInterested?: string
  dealValue?: string
  notes?: string
  assignedTo?: string
  stage?: string
}

const SAVED_VIEWS_STORAGE_KEY = 'crm.leads.savedViews.v1'

const createViewId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const CSV_HEADERS = [
  'clientName',
  'companyName',
  'leadSource',
  'phone',
  'email',
  'serviceType',
  'serviceCategory',
  'serviceInterested',
  'dealValue',
  'notes',
  'assignedTo',
  'stage',
]

const normalizeCsvHeader = (header: string) =>
  header.trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()

const csvHeaderMap: Record<string, keyof CsvLeadRow> = {
  clientname: 'clientName',
  companyname: 'companyName',
  leadsource: 'leadSource',
  phone: 'phone',
  email: 'email',
  servicetype: 'serviceType',
  servicecategory: 'serviceCategory',
  serviceinterested: 'serviceInterested',
  dealvalue: 'dealValue',
  notes: 'notes',
  assignedto: 'assignedTo',
  stage: 'stage',
}

const escapeCsvValue = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const parseCsvText = (csvText: string): CsvLeadRow[] => {
  const rows: string[][] = []
  let currentField = ''
  let currentRow: string[] = []
  let inQuotes = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1
      }
      currentRow.push(currentField)
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      continue
    }

    currentField += char
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) return []

  const headers = rows.shift()!.map(normalizeCsvHeader)
  return rows.map((row) => {
    const lead = {} as CsvLeadRow
    headers.forEach((header, index) => {
      const key = csvHeaderMap[header]
      if (!key) return
      const value = row[index]?.trim() ?? ''
      if (value !== '') {
        lead[key] = value
      }
    })
    return lead
  }).filter((lead) => lead.clientName && lead.phone)
}

const buildLeadsCsv = (leads: Lead[]) => {
  const headerRow = CSV_HEADERS.join(',')
  const dataRows = leads.map((lead) => [
    lead.clientName,
    lead.companyName ?? '',
    lead.leadSource ?? '',
    lead.phone,
    lead.email ?? '',
    lead.serviceType ?? '',
    lead.serviceCategory ?? '',
    lead.serviceInterested ?? '',
    lead.dealValue ?? '',
    lead.notes ?? '',
    lead.assignedTo ?? '',
    lead.stage ?? '',
  ].map(escapeCsvValue).join(','))

  return [headerRow, ...dataRows].join('\n')
}

export default function LeadsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<StoredUser | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [leadView, setLeadView] = useState<'list' | 'card'>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)
  const [savedViews, setSavedViews] = useState<SavedLeadView[]>([])
  const [savedViewsReady, setSavedViewsReady] = useState(false)
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')
  const importInputRef = useRef<HTMLInputElement | null>(null)

  async function fetchLeads() {
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as StoredUser
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
    try {
      const rawViews = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY)
      if (rawViews) {
        const parsedViews = JSON.parse(rawViews)
        if (Array.isArray(parsedViews)) {
          const normalizedViews = parsedViews.filter((view): view is SavedLeadView => (
            view &&
            typeof view.id === 'string' &&
            typeof view.name === 'string' &&
            typeof view.query === 'string' &&
            (view.viewMode === 'list' || view.viewMode === 'card')
          ))
          setSavedViews(normalizedViews.slice(0, 8))
        }
      }
    } catch {
      setSavedViews([])
    } finally {
      setSavedViewsReady(true)
    }
  }, [])

  useEffect(() => {
    if (!savedViewsReady) return
    localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews))
  }, [savedViews, savedViewsReady])

  useEffect(() => {
    if (!pendingEditId) return
    const found = leads.find((lead) => lead.id === pendingEditId)
    if (!found) return
    setSelectedLead(found)
    setPendingEditId(null)
  }, [leads, pendingEditId])

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

  const saveCurrentView = () => {
    const defaultName = searchQuery.trim()
      ? `Search: ${searchQuery.trim().slice(0, 24)}`
      : ""
    setSaveViewName(defaultName)
    setIsSaveViewModalOpen(true)
  }

  const handleSaveViewConfirm = () => {
    const name = saveViewName.trim()
    if (!name) {
      toast.error('Please provide a name for this view.')
      return
    }

    const nextView: SavedLeadView = {
      id: createViewId(),
      name,
      query: searchQuery,
      viewMode: leadView,
      createdAt: Date.now(),
    }

    setSavedViews((current) => [
      nextView,
      ...current.filter((view) => view.name.toLowerCase() !== name.toLowerCase()),
    ].slice(0, 8))

    setIsSaveViewModalOpen(false)
    toast.success(`View Saved as "${name}".`)
  }

  const applySavedView = (view: SavedLeadView) => {
    setSearchQuery(view.query)
    setLeadView(view.viewMode)
  }

  const resetToAllLeads = () => {
    setSearchQuery('')
  }

  const activeSavedView = useMemo(() => (
    savedViews.find((view) => view.query === searchQuery && view.viewMode === leadView) ?? null
  ), [savedViews, searchQuery, leadView])

  const handleExportLeads = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export.')
      return
    }

    const csv = buildLeadsCsv(filteredLeads)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateLabel = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `leads-export-${dateLabel}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    toast.success('Leads export started.')
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const csvText = await file.text()
    const rows = parseCsvText(csvText)

    if (rows.length === 0) {
      toast.error('No valid lead rows were found in the CSV.')
      return
    }

    const proceed = window.confirm(`Import ${rows.length} lead${rows.length === 1 ? '' : 's'} from this CSV?`)
    if (!proceed) return

    let importedCount = 0
    const errors: string[] = []

    for (const [index, row] of rows.entries()) {
      try {
        const response = await fetchWithAuth('/api/leads', {
          method: 'POST',
          body: JSON.stringify({
            clientName: row.clientName,
            companyName: row.companyName || '',
            leadSource: row.leadSource || '',
            phone: row.phone,
            email: row.email || '',
            serviceType: row.serviceType || '',
            serviceCategory: row.serviceCategory || '',
            serviceInterested: row.serviceInterested || '',
            dealValue: row.dealValue || '',
            notes: row.notes || '',
            assignedTo: row.assignedTo || '',
            stage: row.stage && stages.includes(row.stage) ? row.stage : 'FIND_LEADS',
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Import failed')
        }

        importedCount += 1
      } catch (error) {
        const label = row.clientName || `Row ${index + 2}`
        errors.push(`${label}: ${error instanceof Error ? error.message : 'Import failed'}`)
      }
    }

    await fetchLeads()

    const summary = [
      `Imported ${importedCount} lead${importedCount === 1 ? '' : 's'}.`,
      errors.length > 0 ? `Skipped ${errors.length} row${errors.length === 1 ? '' : 's'}.` : null,
    ].filter(Boolean).join(' ')

    if (errors.length > 0) {
      toast.error(`${summary} ${errors.slice(0, 3).join(' • ')}`.trim())
    } else {
      toast.success(summary)
    }
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

          <div className="mb-3 -mt-8 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className='mt-5 flex justify-center items-start gap-4 max-w-[70vw]'>
                <button
                  type="button"
                  onClick={saveCurrentView}
                  className="rounded-lg bg-(--dark-blue) px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-(--dark-blue)/85"
                >
                  Save View
                </button>
                {savedViews.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={resetToAllLeads}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        !activeSavedView
                          ? 'border-(--dark-blue) bg-(--light-blue)/60 text-(--dark-blue)'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-(--dark-blue)/40 hover:text-(--dark-blue)'
                      }`}
                    >
                      All Leads
                    </button>
                    <p className='text-(--dark-blue)'>| &nbsp; Saved Views: </p>
                    {savedViews.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => applySavedView(view)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                          activeSavedView?.id === view.id
                            ? 'border-(--dark-blue) bg-(--dark-blue) text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-(--dark-blue)/40 hover:text-(--dark-blue)'
                        }`}
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className='flex gap-2 items-end justify-center'>
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
            </div>
          </div>

          <FormModal
            isOpen={isSaveViewModalOpen}
            onClose={() => setIsSaveViewModalOpen(false)}
            title="Save View"
            panelClassName="md:max-w-lg border border-(--light-blue)/40"
          >
            <div className="px-4 pb-5 md:px-6">
              <label className="block text-sm font-medium text-(--dark-blue)" htmlFor="save-view-name">
                View name
              </label>
              <input
                id="save-view-name"
                value={saveViewName}
                onChange={(event) => setSaveViewName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-(--dark-blue) focus:ring-2 focus:ring-(--light-blue)"
                placeholder="Name this view"
                autoFocus
              />
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSaveViewModalOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveViewConfirm}
                  className="rounded-lg bg-(--dark-blue) px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-(--dark-blue)/85"
                >
                  Save
                </button>
              </div>
            </div>
          </FormModal>

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
              title={''}
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
