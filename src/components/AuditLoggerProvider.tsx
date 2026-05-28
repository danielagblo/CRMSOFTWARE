'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type AuditLogPayload = {
  action: string
  description?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

type AuditLoggerContextValue = {
  logAction: (payload: AuditLogPayload) => Promise<void>
}

const AuditLoggerContext = createContext<AuditLoggerContextValue | undefined>(undefined)

export function AuditLoggerProvider({ children }: { children: React.ReactNode }) {
  const logAction = useCallback(async (payload: AuditLogPayload) => {
    if (!payload.action) {
      return
    }

    try {
      await fetchWithAuth('/api/audit-logs', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Failed to record audit log.', error)
    }
  }, [])

  const value = useMemo(() => ({ logAction }), [logAction])

  return (
    <AuditLoggerContext.Provider value={value}>
      {children}
    </AuditLoggerContext.Provider>
  )
}

export function useAuditLogger() {
  const context = useContext(AuditLoggerContext)
  if (!context) {
    throw new Error('useAuditLogger must be used within AuditLoggerProvider')
  }
  return context
}
