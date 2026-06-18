'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuditLogger } from '@/components/AuditLoggerProvider'
import { useSiteSettings } from '@/components/SiteSettingsProvider'

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
    icon: dashboardIcon,
  },
  {
    name: 'Pipeline',
    href: '/pipeline',
    icon: pipelineIcon,
  },
  {
    name: 'Task Board',
    href: '/task-board',
    icon: tasksIcon,
  },
  {
    name: 'Contact Book',
    href: '/contacts',
    icon: contactsIcon,
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: leadsIcon,
  }
]

interface NavigationUser {
  name?: string
  email?: string
  role?: string
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<NavigationUser | null>(null)
  const [loading, setLoading] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { logAction } = useAuditLogger()
  const { settings, toggleTheme } = useSiteSettings()
  const iconFilter = settings.themeMode === 'dark' ? 'brightness(0) invert(1)' : 'none'
  const isProtectedRoute =
    pathname === '/dashboard' ||
    pathname === '/pipeline' ||
    pathname === '/task-board' ||
    pathname === '/contacts' ||
    pathname === '/leads' ||
    pathname.startsWith('/leads/') ||
    pathname === '/logs' ||
    pathname === '/site-customisation' ||
    pathname === '/users'

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    window.requestAnimationFrame(() => {
      if (storedUser) {
        setUser(JSON.parse(storedUser) as NavigationUser)
      }
      setLoading(false)
    })
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
      <nav className="theme-nav shadow-lg border-b sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 flex items-center justify-center animate-pulse">
                  <Image src={settings.logoUrl || skytechLogo} alt="Logo" className="w-4 h-4 object-contain" width={40} height={40} style={{ filter: iconFilter }} />
              </div>
              <div className="hidden sm:block ml-3">
                <h1 className="text-xl font-bold theme-text animate-pulse">
                    {settings.companyName}
                </h1>
                <p className="text-xs theme-text-muted -mt-1">Loading...</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--surface-muted)' }}></div>
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
    <nav className="theme-nav shadow-lg border-b sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-22 h-18 flex items-center justify-center">
                <Image src={settings.logoUrl || skytechLogo} alt="Logo" className="min-w-22 w-full h-full object-contain" width={88} height={72} style={{ filter: iconFilter }} />
              </div>
              <div className='hidden sm:block'>
                <h1 className="text-xl font-bold theme-text">
                  {settings.companyName}
                </h1>
                <p className="text-xs whitespace-nowrap theme-text-muted -mt-1">Sales Management</p>
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
                      ? 'bg-(--surface-muted) text-(--dark-brown) shadow-sm border border-(--surface-border)'
                      : 'theme-text hover:text-(--dark-brown) transition'
                  }`}
                >
                  <span className={isActive ? 'text-(--dark-brown)' : 'theme-text-muted'}>
                    <Image src={item.icon} alt={item.name} className="w-4 h-4" width={16} height={16} style={{ filter: iconFilter }} />
                  </span>
                  <span className='whitespace-nowrap'>{item.name}</span>
                </Link>
              )
            })}
            
            {user?.role === 'ADMIN' && (
              <Link
                href="/users"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/users'
                    ? 'bg-(--surface-muted) text-(--dark-brown) shadow-sm border border-(--surface-border)'
                    : 'theme-text hover:text-(--dark-brown) transition'
                }`}
              >
                <span className={pathname === '/users' ? 'text-(--dark-brown)' : 'theme-text-muted'}>
                  <Image src={usersIcon} alt="" className="w-6 h-6" width={24} height={24} style={{ filter: iconFilter }} />
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
                className="flex items-center space-x-3 theme-surface hover:bg-(--surface-muted) rounded-lg px-3 py-2 transition-all duration-200 border theme-border shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'var(--surface-muted)' }}>
                  <span className="theme-text text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium theme-text">{user?.name || 'User'}</div>
                  <div className="text-xs theme-text-muted">{user?.role || 'ADMIN'}</div>
                </div>
                <svg
                  className={`w-4 h-4 theme-text-muted transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="theme-nav-popover absolute right-0 mt-2 w-56 rounded-xl shadow-xl border py-2 z-50">
                  <div className="px-4 py-3 border-b theme-border">
                    <div className="text-sm font-medium theme-text">{user?.name || 'User'}</div>
                    <div className="text-sm theme-text-muted">{user?.email || 'Email has not been set'}</div>
                    <div className="text-xs text-(--dark-brown) font-medium mt-1">{user?.role || 'Role has not been set'}</div>
                  </div>
                  <div className="py-1">
                    {isAdmin && (
                      <>
                        <Link
                          href="/logs"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center w-full px-4 py-2 text-sm theme-text-muted hover:bg-(--surface-muted)"
                        >
                          <Image src={logsIcon} alt="logs" className="w-4 h-4 mr-3" width={16} height={16} style={{ filter: iconFilter }} />
                          Site Logs
                        </Link>
                        <Link
                          href="/site-customisation"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center w-full px-4 py-2 text-sm theme-text-muted hover:bg-(--surface-muted)"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                          </svg>
                          Site Customisation
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            toggleTheme()
                            setUserMenuOpen(false)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm theme-text-muted hover:bg-(--surface-muted)"
                        >
                          {settings.themeMode === 'dark' ? (
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ):(
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646a9 9 0 1011.708 11.708z" />
                            </svg>
                          )}
                          {settings.themeMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="border-t theme-border pt-1">
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
                className="inline-flex items-center justify-center p-2 rounded-lg theme-text-muted hover:theme-text focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
                style={{ background: 'var(--surface-muted)' }}
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
        <div className="md:hidden theme-nav-popover border-t shadow-lg">
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
                      ? 'bg-(--surface-muted) text-(--dark-brown) shadow-sm border border-(--surface-border)'
                      : 'bg-(--surface) theme-text-muted hover:bg-(--surface-muted) hover:text-indigo-600'
                  }`}
                >
                  <span className={isActive ? 'text-(--dark-brown)' : 'theme-text-muted'}>
                    <Image src={item.icon} alt={item.name} className="w-4 h-4" width={16} height={16} style={{ filter: iconFilter }} />
                  </span>
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
                    ? 'bg-(--surface-muted) text-(--dark-brown) shadow-sm border border-(--surface-border)'
                    : 'bg-(--surface) theme-text-muted hover:bg-(--surface-muted) hover:text-indigo-600'
                }`}
              >
                <span className={pathname === '/users' ? 'text-(--dark-brown)' : 'theme-text-muted'}>
                  <Image src={usersIcon} alt="Users" className="w-5 h-5" width={20} height={20} style={{ filter: iconFilter }} />
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
