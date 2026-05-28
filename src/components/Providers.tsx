'use client'

import { SessionProvider } from 'next-auth/react'
import { AuditLoggerProvider } from '@/components/AuditLoggerProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuditLoggerProvider>{children}</AuditLoggerProvider>
    </SessionProvider>
  )
}