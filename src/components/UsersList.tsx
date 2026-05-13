'use client'

import React, { useEffect, useState, useCallback } from 'react'
import FormModal from '@/lib/formModal'
import userIcon from '@/assets/user.svg'
import emailIcon from '@/assets/at-sign.svg'
import padlockIcon from '@/assets/padlock.svg'
import eyeOpenIcon from '@/assets/eye-open.svg'
import eyeClosedIcon from '@/assets/eye-closed.svg'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'SALES' | 'ADMIN'
}

interface ValidationErrors {
  password?: string
  confirmPassword?: string
}

export default function UsersList({ initialUsers, searchQuery = '' }: { initialUsers: any[], searchQuery?: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isXlUp, setIsXlUp] = useState(false)
  const [formData, setFormData] = useState<FormData>({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'SALES' 
  })

  useEffect(() => {
    const openCreateModal = () => {
      setFormMode('create')
      setSelectedUser(null)
      setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'SALES' })
      setValidationErrors({})
      setShowPassword(false)
      setShowConfirmPassword(false)
      setIsFormOpen(true)
    }
    window.addEventListener('users:add', openCreateModal)
    return () => window.removeEventListener('users:add', openCreateModal)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsXlUp(window.innerWidth >= 1280)
    }
    
    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-action-menu]') && !target.closest('[data-action-button]')) {
        setActiveActionMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (formMode === 'create' && !formData.password) {
      errors.password = 'Password is required'
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const url = '/api/users'
      const method = selectedUser ? 'PATCH' : 'POST'
      const body = selectedUser 
        ? { id: selectedUser.id, name: formData.name, email: formData.email, role: formData.role }
        : { name: formData.name, email: formData.email, password: formData.password, role: formData.role }

      // If editing and password is empty, don't send it
      if (selectedUser && formData.password) {
        (body as any).password = formData.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updatedUser = await res.json()
        if (selectedUser) {
          setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
        } else {
          setUsers([updatedUser, ...users])
        }
        closeForm()
      } else {
        const err = await res.json()
        alert(err.error || 'Operation failed')
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const openEditForm = (user: User) => {
    setSelectedUser(user)
    setFormData({ name: user.name, email: user.email, password: '', confirmPassword: '', role: user.role as 'SALES' | 'ADMIN' })
    setFormMode('edit')
    setValidationErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
    setIsFormOpen(true)
    setActiveActionMenu(null)
  }

  const openViewForm = (user: User) => {
    setSelectedUser(user)
    setFormData({ name: user.name, email: user.email, password: '', confirmPassword: '', role: user.role as 'SALES' | 'ADMIN' })
    setFormMode('view')
    setIsFormOpen(true)
    setActiveActionMenu(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedUser(null)
    setFormMode('create')
    setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'SALES' })
    setValidationErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id))
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete user')
      }
    } catch (err) {
      alert('An error occurred')
    }
    setActiveActionMenu(null)
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  })

  const isReadOnly = formMode === 'view'

  // Memoized onChange handlers to prevent input focus loss
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
  }, [])

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }))
  }, [])

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }))
  }, [])

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
  }, [])

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, role: e.target.value as 'SALES' | 'ADMIN' }))
  }, [])

  const renderForm = () => (
    <>
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {formMode === 'view' ? 'User Details' : formMode === 'edit' ? 'Edit User' : '+ Add a New User'}
        </p>
        <h3 className="text-lg font-semibold text-gray-900">{selectedUser?.name || 'User'}</h3>
        <p className="text-sm text-gray-500">
          {formMode === 'view' ? 'Read-only view' : formMode === 'edit' ? 'Update user details' : 'Enter user information to create a new user'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-red-500 mr-1">*</span>
            Full Name
          </label>
          <div className="relative">
            <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" src={userIcon.src} alt="Name" />
            <input
              disabled={isReadOnly}
              required
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-12 pr-3 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleNameChange}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-red-500 mr-1">*</span>
            Email Address
          </label>
          <div className="relative">
            <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" src={emailIcon.src} alt="Email" />
            <input
              type="email"
              disabled={isReadOnly}
              required
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-12 pr-3 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleEmailChange}
            />
          </div>
        </div>

        {!isReadOnly && (
          <>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {selectedUser ? 'New Password (leave blank to keep)' : <><span className="text-red-500 mr-1">*</span>Initial Password</>}
              </label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" src={padlockIcon.src} alt="Password" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!selectedUser}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-12 pr-10 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
                  placeholder="*****"
                  value={formData.password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {!showPassword ? (
                    <img className="w-5 h-5" title='Show Password' src={eyeClosedIcon.src} alt="hide" />
                  ) : (
                    <img className="w-5 h-5" title='Hide Password' src={eyeOpenIcon.src} alt="show" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-red-600 text-sm">{validationErrors.password}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {selectedUser ? 'Confirm New Password' : <><span className="text-red-500 mr-1">*</span>Confirm Password</>}
              </label>
              <div className="relative">
                <img className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" src={padlockIcon.src} alt="Confirm password" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required={!selectedUser && !formData.password ? false : formData.password ? true : false}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-12 pr-10 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
                  placeholder="*****"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {!showConfirmPassword ? (
                    <img className="w-5 h-5" title='Show Password' src={eyeClosedIcon.src} alt="hide" />
                  ) : (
                    <img className="w-5 h-5" title='Hide Password' src={eyeOpenIcon.src} alt="show" />
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-red-600 text-sm">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">System Role</label>
          <select
            disabled={isReadOnly}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
            value={formData.role}
            onChange={handleRoleChange}
          >
            <option value="SALES">Sales Representative</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>

        {!isReadOnly && (
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-70"
            >
              {loading ? 'Processing...' : (selectedUser ? 'Update User' : 'Create User')}
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setFormMode('edit')}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
            >
              Edit
            </button>
          </div>
        )}
      </form>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="xl:grid xl:grid-cols-12 xl:gap-6">
        {/* Table Section */}
        <div className={`${isFormOpen ? 'xl:col-span-8' : 'xl:col-span-12'} 2xl:col-span-8`}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id}
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        selectedUser?.id === user.id 
                          ? 'xl:border-indigo-500 xl:ring-1 xl:ring-indigo-200 xl:bg-indigo-50/40' 
                          : ''
                      }`}
                    >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-sm ${
                      user.role === 'ADMIN' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden sm:flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => openViewForm(user)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="text-green-600 hover:text-green-900 text-sm font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.name)}
                          className="text-red-600 hover:text-red-900 text-sm font-semibold"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="relative sm:hidden" data-action-menu>
                        <button
                          data-action-button
                          type="button"
                          onClick={() => setActiveActionMenu(activeActionMenu === user.id ? null : user.id)}
                          className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                          </svg>
                        </button>
                        {activeActionMenu === user.id && (
                          <div
                            data-action-menu
                            className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50 flex flex-col"
                          >
                            <button
                              type="button"
                              onClick={() => openViewForm(user)}
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-50 transition-colors"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(user)}
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id, user.name)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

        {/* Sidebar for xl screens (when form is open) */}
        {isFormOpen ? (
          <aside className="hidden xl:block 2xl:hidden xl:col-span-4">
            <div className="sticky top-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              {renderForm()}
            </div>
          </aside>
        ) : null}

        {/* Sidebar for 2xl screens (always visible) */}
        <aside className="hidden 2xl:block 2xl:col-span-4">
          <div className="sticky top-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {renderForm()}
          </div>
        </aside>
      </div>

      {/* Modal for max-2xl screens */}
      <FormModal
        isOpen={isFormOpen && !isXlUp}
        onClose={closeForm}
        title=""
        wrapperClassName="xl:hidden"
      >
        {renderForm()}
      </FormModal>
    </div>
  )
}
