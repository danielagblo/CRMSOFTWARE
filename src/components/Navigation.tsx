'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuditLogger } from '@/components/AuditLoggerProvider'

import skytechLogo from '../assets/skytechLogo.png'
import dashboardIcon from '../assets/dashboard.svg'
import pipelineIcon from '../assets/pipeline.svg'
import tasksIcon from '../assets/taskboard.svg'
import contactsIcon from '../assets/contactbook.svg'
import leadsIcon from '../assets/leads.svg'
import usersIcon from '../assets/users.svg'
import logsIcon from '../assets/logs.svg'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <img src={dashboardIcon.src} alt="" className="w-4 h-4" />
    ),
  },
  {
    name: 'Pipeline',
    href: '/pipeline',
    icon: (
      <img src={pipelineIcon.src} alt="" className="w-4 h-4" />
    ),
  },
  {
    name: 'Task Board',
    href: '/task-board',
    icon: (
      <img src={tasksIcon.src} alt="" className="w-4 h-4" />
    ),
  },
  {
    name: 'Contact Book',
    href: '/contacts',
    icon: (
      <img src={contactsIcon.src} alt="" className="w-4 h-4" />
    ),
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: (
      <img src={leadsIcon.src} alt="" className="w-4 h-4" />
    ),
  },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { logAction } = useAuditLogger()
  const isProtectedRoute =
    pathname === '/dashboard' ||
    pathname === '/pipeline' ||
    pathname === '/task-board' ||
    pathname === '/contacts' ||
    pathname === '/leads' ||
    pathname.startsWith('/leads/') ||
    pathname === '/logs' ||
    pathname === '/users'

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  // Handle click outside user menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Keep header visible on protected pages while user data hydrates.
  if (loading && isProtectedRoute) {
    return (
      <nav className="shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 flex items-center justify-center animate-pulse">
                <img src="/skytechLogo.png" alt="Logo" className="w-4 h-4" />
              </div>
              <div className="hidden sm:block ml-3">
                <h1 className="text-xl font-bold text-(--dark-blue) animate-pulse">
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
    await logAction({
      action: 'auth.logout',
      description: 'User signed out.'
    })
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <nav className="shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-22 h-18 flex items-center justify-center">
                <img src={skytechLogo.src} alt='Logo' className='min-w-22 w-full h-full' />
              </div>
              <div className='hidden sm:block'>
                <h1 className="text-xl font-bold text-(--dark-blue)">
                  CRM Pro
                </h1>
                <p className="text-xs whitespace-nowrap text-gray-500 -mt-1">Sales Management</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-(--dark-brown) text-white shadow-lg'
                      : 'text-(--dark-blue) hover:text-(--dark-brown) transition'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                  <span className='whitespace-nowrap'>{item.name}</span>
                </Link>
              )
            })}
            
            {user?.role === 'ADMIN' && (
              <Link
                href="/users"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/users'
                    ? 'bg-(--dark-brown) text-white shadow-lg'
                    : 'text-(--dark-blue) hover:text-(--dark-brown) transition'
                }`}
              >
                <span className={pathname === '/users' ? 'text-white' : 'text-gray-500'}>
                  <img src={usersIcon.src} alt="" className="w-6 h-6" />
                </span>
                <span className='whitespace-nowrap'>Users</span>
              </Link>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-(--dark-blue)  rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-(--dark-blue)">{user?.name || 'User'}</div>
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
                    <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
                    <div className="text-sm text-gray-500">{user?.email || 'Email has not been set'}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-1">{user?.role || 'Role has not been set'}</div>
                  </div>
                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        href="/logs"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <img className="w-4 h-4 mr-3" src={logsIcon.src} alt="logs" />
                        Site Logs
                      </Link>
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
                  onClick={() => {
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
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
                onClick={() => {
                  setMobileMenuOpen(false)
                }}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  pathname === '/users'
                    ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
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