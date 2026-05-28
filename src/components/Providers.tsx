'use client'

import { SessionProvider } from 'next-auth/react'
import { AuditLoggerProvider } from '@/components/AuditLoggerProvider'
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SiteSettingsProvider>
        <AuditLoggerProvider>{children}</AuditLoggerProvider>
      </SiteSettingsProvider>
    </SessionProvider>
  )
}