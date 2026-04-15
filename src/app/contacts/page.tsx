'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  }

  const handleCreateContact = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Name and number are required.')
      return
    }

    setIsSubmitting(true)
    fetchWithAuth('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone,
        email,
        location,
        businessType,
        note
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to add contact.')
        }
        const created = (await response.json()) as ContactEntry
        setContacts((prev) => [created, ...prev])
        resetForm()
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to add contact.'
        alert(message)
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
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete contact.'
        alert(message)
      })
  }

  const handlePushToLeads = async (contact: ContactEntry) => {
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
      alert('Contact pushed to leads and removed from contacts.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to push contact to leads.'
      alert(message)
    } finally {
      setIsPushingId(null)
    }
  }

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [contacts]
  )

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-3 sm:p-4">
      <div className="h-full rounded-2xl border border-indigo-100 bg-white shadow-sm flex flex-col min-h-0">
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-100 font-semibold">Contacts</p>
          <h1 className="text-xl font-semibold">Business Contacts Book</h1>
          <p className="text-sm text-indigo-100 mt-1">Create contact entries and push them directly to your leads list.</p>
        </div>

        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name *"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Number *"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Business type"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreateContact}
              disabled={isSubmitting}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Add Contact
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            rows={2}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {isLoadingContacts ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Loading contacts...
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              No contacts yet. Add your first business contact above.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {sortedContacts.map((contact, index) => (
                <div key={contact.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-indigo-600">Contact #{index + 1}</p>
                      <h2 className="text-sm font-semibold text-gray-900">{contact.name}</h2>
                      <p className="text-xs text-gray-500">{contact.businessType || 'Business type not set'}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Ready to Push
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-gray-700">
                    <p><span className="font-medium">Number:</span> {contact.phone}</p>
                    <p><span className="font-medium">Email:</span> {contact.email || '-'}</p>
                    <p><span className="font-medium">Location:</span> {contact.location || '-'}</p>
                    <p className="break-words"><span className="font-medium">Note:</span> {contact.note || '-'}</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handlePushToLeads(contact)}
                      disabled={isPushingId === contact.id}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isPushingId === contact.id
                        ? 'Pushing...'
                        : 'Push to Leads'}
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
