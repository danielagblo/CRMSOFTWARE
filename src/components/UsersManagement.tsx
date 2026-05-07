'use client'

import { useState } from 'react'
import PageHeader from '@/components/PageHeader'
import SearchBar from '@/components/SearchBar'
import UsersList from '@/components/UsersList'

export default function UsersManagement({ initialUsers }: { initialUsers: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <PageHeader
        eyebrow="User Management"
        title="Users"
        description="Manage your team members and their access levels."
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
            onClick={() => window.dispatchEvent(new Event('users:add'))}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Add New User
          </button>
        )}
      />

      <UsersList initialUsers={initialUsers} searchQuery={searchQuery} />
    </>
  )
}
