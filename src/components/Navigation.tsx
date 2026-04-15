'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Pipeline',
    href: '/pipeline',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    name: 'Task Bar',
    href: '/task-board',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    ),
  },
  {
    name: 'Contacts',
    href: '/contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const isProtectedRoute =
    pathname === '/dashboard' ||
    pathname === '/pipeline' ||
    pathname === '/task-board' ||
    pathname === '/contacts' ||
    pathname === '/leads' ||
    pathname.startsWith('/leads/') ||
    pathname === '/users'

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  // Keep header visible on protected pages while user data hydrates.
  if (loading && isProtectedRoute) {
    return (
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="hidden sm:block ml-3">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  CRM Pro
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Loading...</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </nav>
    )
  }

  // Keep nav hidden on non-protected routes (home/login) or explicitly on the login page.
  if (pathname === '/login' || (!isProtectedRoute && !user)) {
    return null
  }

  // Filter navigation items based on role
  const isAdmin = user?.role === 'ADMIN'
  const visibleNavigation = navigation.filter(item => {
    if (!isAdmin) {
      return item.href === '/pipeline' || item.href === '/task-board' || item.href === '/contacts'
    }
    return true
  })

  const handleSignOut = async () => {
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleNavigate = (href: string) => {
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
    router.push(href)
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  CRM Pro
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Sales Management</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              )
            })}
            
            {user?.role === 'ADMIN' && (
              <Link
                href="/users"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/users'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                }`}
              >
                <span className={pathname === '/users' ? 'text-white' : 'text-gray-500'}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </span>
                <span>Users</span>
              </Link>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">{user?.name || 'SkyTech'}</div>
                  <div className="text-xs text-gray-500">{user?.role || 'ADMIN'}</div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{user?.name || 'SkyTech'}</div>
                    <div className="text-sm text-gray-500">{user?.email || 'admin@crm.com'}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-1">{user?.role || 'ADMIN'}</div>
                  </div>
                  <div className="py-1">
                    {isAdmin && (
                      <button
                        onClick={() => handleNavigate('/dashboard')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                        Go to Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigate('/pipeline')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      </svg>
                      Go to Pipeline
                    </button>
                    <button
                      onClick={() => handleNavigate('/task-board')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      Go to Task Bar
                    </button>
                    <button
                      onClick={() => handleNavigate('/contacts')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                      Go to Contacts
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleNavigate('/leads')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Go to Leads
                      </button>
                    )}
                  </div>
                  <div className="border-t border-gray-200 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="bg-gray-100 inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className={`block h-6 w-6 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-900 border-t border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse ml-auto"></div>
                  )}
                </Link>
              )
            })}
            
            {user?.role === 'ADMIN' && (
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  pathname === '/users'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                }`}
              >
                <span className={pathname === '/users' ? 'text-white' : 'text-gray-500'}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </span>
                <span>Users</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </nav>
  )
}