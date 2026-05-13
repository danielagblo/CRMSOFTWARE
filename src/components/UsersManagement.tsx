'use client'

import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import UsersList from '@/components/UsersList'

export default function UsersManagement({ initialUsers }: { initialUsers: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    const handleFormState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>
      setIsFormOpen(Boolean(customEvent.detail?.isOpen))
    }

    window.addEventListener('users:form-state', handleFormState)
    return () => window.removeEventListener('users:form-state', handleFormState)
  }, [])

  const filteredCount = useMemo(() => {
    if (!searchQuery.trim()) return initialUsers.length
    const query = searchQuery.toLowerCase()
    return initialUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    ).length
  }, [initialUsers, searchQuery])

  return (
    <>
      <PageHeader
        eyebrow="User Management"
        title="Users"
        description={`Manage your team members and their access levels.`}
        leftAction={
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users..."
          />
        }
        action={(
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('users:toggle-create'))}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {isFormOpen ? 'Close Form' : 'Add New User'}
          </button>
        )}
      />
      {
        filteredCount > 0 ? (
          <UsersList initialUsers={initialUsers} searchQuery={searchQuery} />
        ) : ( 
          <div className="mt-12 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
              <p className="mt-2 text-sm text-gray-600">Try adjusting your search or add a new user.</p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('users:add'))}
              className="rounded-lg underline px-4 text-sm font-medium text-gray-500 hover:text-gray-400 transition"
            >
              Would you like to add a new user?
            </button>
          </div>
         )
      }
    </>
  )
}
