'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import FormModal from '@/lib/formModal'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import { 
  validateContactForm, 
  showFeedback, 
  showValidationErrors,
  filterPhoneInput,
  filterEmailInput 
} from '@/lib/contactValidation'
import userIcon from '@/assets/user.svg'
import phoneIcon from '@/assets/hash.svg'
import emailIcon from '@/assets/at-sign.svg'
import locationIcon from '@/assets/location.svg'
import businessIcon from '@/assets/business.svg'
import noteIcon from '@/assets/note.svg'

interface ContactEntry {
  id: string
  name: string
  phone: string
  email: string | null
  location: string | null
  businessType: string | null
  note: string | null
  createdAt: string
}

interface LeadApiResponse {
  id: string
}

const getPushReadiness = (contact: ContactEntry) => {
  const hasName = Boolean(contact.name?.trim())
  const hasContactChannel = Boolean(contact.phone?.trim() || contact.email?.trim())

  const missing: string[] = []
  if (!hasName) missing.push('Name')
  if (!hasContactChannel) missing.push('Contact (email or number)')

  return {
    isReady: missing.length === 0,
    missing
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isPushingId, setIsPushingId] = useState<string | null>(null)
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const response = await fetchWithAuth('/api/contacts')
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to load contacts.')
        }
        const data = (await response.json()) as ContactEntry[]
        setContacts(Array.isArray(data) ? data : [])
      } catch {
        setContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }

    loadContacts()
}, [])

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setLocation('')
    setBusinessType('')
    setNote('')
    setEditingContactId(null)
  }

  const openEditModal = (contact: ContactEntry) => {
    setEditingContactId(contact.id)
    setName(contact.name)
    setPhone(contact.phone)
    setEmail(contact.email || '')
    setLocation(contact.location || '')
    setBusinessType(contact.businessType || '')
    setNote(contact.note || '')
    setIsFormModalOpen(true)
  }

  const handleCreateContact = () => {
    // Validate inputs
    const validation = validateContactForm(name, phone, email)

    if (!validation.isValid) {
      showValidationErrors(validation.errors)
      return
    }

    setIsSubmitting(true)

    const endpoint = editingContactId ? `/api/contacts` : '/api/contacts'
    const method = editingContactId ? 'PATCH' : 'POST'
    const body = {
      ...(editingContactId && { id: editingContactId }),
      name,
      phone,
      email,
      location,
      businessType,
      note
    }

    fetchWithAuth(endpoint, {
      method,
      body: JSON.stringify(body)
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || (editingContactId ? 'Failed to update contact.' : 'Failed to add contact.'))
        }
        const data = (await response.json()) as ContactEntry
        
        if (editingContactId) {
          setContacts((prev) =>
            prev.map((contact) => (contact.id === editingContactId ? data : contact))
          )
          showFeedback({
            type: 'success',
            title: 'Contact Updated',
            description: `${data.name} has been updated.`
          })
        } else {
          setContacts((prev) => [data, ...prev])
          showFeedback({
            type: 'success',
            title: 'Contact Added',
            description: `${data.name} has been added to your contacts.`
          })
        }
        resetForm()
        setIsFormModalOpen(false)
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : (editingContactId ? 'Failed to update contact.' : 'Failed to add contact.')
        showFeedback({
          type: 'error',
          title: editingContactId ? 'Failed to Update Contact' : 'Failed to Add Contact',
          description: message
        })
      })
      .finally(() => {
        setIsSubmitting(false)
      })

  }

  const handleDeleteContact = (contactId: string) => {
    const confirmed = window.confirm('Delete this contact entry?')
    if (!confirmed) return
    fetchWithAuth('/api/contacts', {
      method: 'DELETE',
      body: JSON.stringify({ id: contactId })
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to delete contact.')
        }
        setContacts((prev) => prev.filter((contact) => contact.id !== contactId))
        showFeedback({
          type: 'success',
          title: 'Contact Deleted',
          description: 'The contact has been removed from your list.'
        })
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete contact.'
        showFeedback({
          type: 'error',
          title: 'Failed to Delete Contact',
          description: message
        })
      })
  }

  const handlePushToLeads = async (contact: ContactEntry) => {
    const readiness = getPushReadiness(contact)
    if (!readiness.isReady) {
      showFeedback({
        type: 'error',
        title: 'Contact not ready to push',
        description: `Missing: ${readiness.missing.join(', ')}.`
      })
      return
    }

    if (isPushingId) return
    setIsPushingId(contact.id)

    try {
      const response = await fetchWithAuth('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          clientName: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          companyName: contact.businessType || undefined,
          leadSource: 'Contacts',
          notes: [
            contact.note ? `Contact Note: ${contact.note}` : '',
            contact.location ? `Location: ${contact.location}` : '',
            contact.businessType ? `Business Type: ${contact.businessType}` : ''
          ]
            .filter(Boolean)
            .join('\n')
        })
      })

      const data = (await response.json()) as { error?: string } | LeadApiResponse
      if (!response.ok) {
        const message = 'error' in data && data.error ? data.error : 'Failed to push contact to leads.'
        throw new Error(message)
      }

      const deleteResponse = await fetchWithAuth('/api/contacts', {
        method: 'DELETE',
        body: JSON.stringify({ id: contact.id })
      })
      if (!deleteResponse.ok) {
        const payload = await deleteResponse.json().catch(() => null)
        throw new Error(payload?.error || 'Lead created, but failed to remove contact.')
      }

      setContacts((prev) => prev.filter((item) => item.id !== contact.id))
      showFeedback({
        type: 'success',
        title: 'Contact Pushed to Leads',
        description: `${contact.name} has been moved to your leads list.`
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to push contact to leads.'
      showFeedback({
        type: 'error',
        title: 'Failed to Push to Leads',
        description: message
      })
    } finally {
      setIsPushingId(null)
    }
  }

  const sortedAndFilteredContacts = useMemo(() => {
    let filtered = [...contacts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        (contact.location && contact.location.toLowerCase().includes(query)) ||
        (contact.businessType && contact.businessType.toLowerCase().includes(query)) ||
        (contact.note && contact.note.toLowerCase().includes(query))
      )
    }
    
    return filtered
  }, [contacts, searchQuery])

  const contactFormContent = (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className='relative'>
        <img className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5' src={userIcon.src} alt="user" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contact name *"
          className="rounded-lg border pl-12 min-h-12 mb-2 w-full border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 ">
        <div className='relative'>
          <img className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5' src={phoneIcon.src} alt="phone" />
          <input
            value={phone}
            onChange={(e) => setPhone(filterPhoneInput(e.target.value))}
            placeholder="Number *"
            className="rounded-lg border w-full pl-12 min-h-12 border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className='relative'>
          <img className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5' src={emailIcon.src} alt="email" />
          <input
            value={email}
            onChange={(e) => setEmail(filterEmailInput(e.target.value))}
            placeholder="Email"
            className="rounded-lg border w-full pl-12 min-h-12 border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className='relative'>
          <img className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5' src={locationIcon.src} alt="location" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded-lg border w-full pl-12 min-h-12 border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className='relative'>
          <img className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5' src={businessIcon.src} alt="business" />
          <input
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="Business type"
            className="rounded-lg border w-full pl-12 min-h-12 border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className='relative'>
        <img className='absolute left-3 top-5 h-5 w-5' src={noteIcon.src} alt="note" />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note"
          rows={2}
          className="mt-3 w-full rounded-lg border border-gray-300 pl-12 min-h-25 lg:min-h-40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="w-full flex cursor-pointer justify-end">
        <button
          onClick={handleCreateContact}
          disabled={isSubmitting}
          className="rounded-lg cursor-pointer bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? (editingContactId ? 'Updating...' : 'Adding...') : (editingContactId ? 'Update Contact' : 'Add Contact')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 sm:px-0">
          <PageHeader
            eyebrow="Contacts"
            title="Business Contacts Book"
            description="Create contact entries and push them directly to your leads list."
            leftAction={
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search Contact Book..."
              />
            }
            action={(
              <button
                onClick={() => setIsFormModalOpen(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Add Contact
              </button>
            )}
          />

          <FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false)
              resetForm()
            }}
            title={editingContactId ? 'Edit Contact' : 'Add Contact'}
          >
            {contactFormContent}
          </FormModal>

          <div className="overflow-y-auto">
            {isLoadingContacts ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Loading contacts...
              </div>
            ) : sortedAndFilteredContacts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                {searchQuery ? 'No contacts match your search.' : 'No contacts yet. Add your first business contact above.'}
              </div>
            ) : (
              <div className="max-sm:flex md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 items-stretch flex-row flex-wrap max-lg:gap-3 items-center gap-3">
                {sortedAndFilteredContacts.map((contact) => {
                  const pushReadiness = getPushReadiness(contact)
                  const isPushBusy = isPushingId === contact.id
                  const isPushDisabled = !pushReadiness.isReady || isPushBusy
                  const missingTitle = pushReadiness.isReady
                    ? ''
                    : `Needed to push:\n- ${pushReadiness.missing.join('\n- ')}`

                  return (
                  <div 
                    key={contact.id} 
                    onClick={() => openEditModal(contact)}
                    className="w-full rounded-xl flex flex-col justify-between max-lg:px-3 border border-gray-200 bg-white p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-start  justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">{contact.name}</h2>
                        <p className="text-sm text-gray-500">{contact.businessType || ""}</p>
                      </div>
                      {pushReadiness.isReady ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-200 text-green-800 border border-green-800 font-medium">
                          &#x2605; <span className='pl-1'>Ready to Push</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1 text-base text-gray-700">
                      <p><span className="font-medium">Number:</span> {contact.phone || '-'}</p>
                      <p><span className="font-medium">Email:</span> {contact.email || '-'}</p>
                      <p><span className="font-medium">Location:</span> {contact.location || '-'}</p>
                      <p className="break-words"><span className="font-medium">Note:</span> {contact.note || '-'}</p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <div className="flex-1" title={missingTitle}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePushToLeads(contact)
                          }}
                          disabled={isPushDisabled}
                          className="w-full rounded-md cursor-pointer bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                          {isPushBusy
                            ? 'Pushing...'
                            : 'Push to Leads'}
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteContact(contact.id)
                        }}
                        className="rounded-md border cursor-pointer border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
