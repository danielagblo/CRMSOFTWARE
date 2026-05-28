'use client'

import { useEffect, useRef, useState } from 'react'

type AuditLogRow = {
  id: string
  actorName: string | null
  actorEmail: string | null
  actorId: string | null
  action: string
  entityType: string
  entityId: string | null
  description: string | null
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

interface AuditLogsTableProps {
  logs: AuditLogRow[]
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return ''
  }

  return JSON.stringify(metadata, null, 2)
}

function DetailsPopover({ log }: { log: AuditLogRow }) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    const panel = popoverRef.current
    if (!rect || !panel) return

    const viewportPadding = 16
    const preferredWidth = 320
    const panelHeight = Math.min(panel.offsetHeight || 384, window.innerHeight - viewportPadding * 2)
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const shouldOpenAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow

    const left = Math.min(
      Math.max(rect.right - preferredWidth, viewportPadding),
      window.innerWidth - preferredWidth - viewportPadding,
    )
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - panelHeight - 12)
      : Math.min(rect.bottom + 12, window.innerHeight - panelHeight - viewportPadding)

    setPosition({ top, left })
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncMode = () => setIsDesktop(mediaQuery.matches)

    syncMode()
    mediaQuery.addEventListener('change', syncMode)

    return () => {
      mediaQuery.removeEventListener('change', syncMode)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    if (isDesktop) {
      requestAnimationFrame(() => updatePosition())
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleViewportChange = () => updatePosition()

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [isDesktop, open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        View details
      </button>

      {open ? (
        <>
          {!isDesktop ? <div className="fixed inset-0 z-40 bg-slate-950/20" aria-hidden="true" /> : null}
          <div
            ref={popoverRef}
            className={isDesktop ? 'fixed z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5' : 'fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-slate-200 bg-white shadow-[0_-12px_32px_rgba(15,23,42,0.22)]'}
            style={isDesktop ? { top: position.top, left: position.left } : undefined}
          >
            <div className={isDesktop ? 'border-b border-slate-100 px-4 py-3' : 'border-b border-slate-100 px-4 pb-3 pt-4'}>
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />
              <div className="text-sm font-semibold text-slate-900">{log.action}</div>
              <div className="mt-1 text-xs text-slate-500">
                {log.entityType}{log.entityId ? ` • ${log.entityId}` : ''}
              </div>
            </div>
            <div className={isDesktop ? 'space-y-3 px-4 py-4 text-sm text-slate-700' : 'max-h-[70vh] space-y-3 overflow-y-auto px-4 py-4 text-sm text-slate-700'}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</div>
                <div className="mt-1 text-slate-900">{log.description || 'No description provided.'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">User Agent</div>
                <div className="mt-1 wrap-break-word text-xs text-slate-600">{log.userAgent || 'n/a'}</div>
              </div>
              {log.metadata ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</div>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                    {formatMetadata(log.metadata)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

export default function AuditLogsTable({ logs }: AuditLogsTableProps) {
  return (
    <>
      <div className="overflow-x-auto rounded-b-2xl shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-sm text-slate-500" colSpan={6}>
                  No audit logs matched the current filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-6 py-4 text-sm text-(--dark-blue) whitespace-nowrap">
                    <div>{log.createdAt.toLocaleString()}</div>
                    <div className="mt-1 text-xs text-slate-400">{log.ipAddress || 'No IP'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-(--dark-blue)">
                    <div className="font-medium">{log.actorName || 'System'}</div>
                    <div className="text-xs text-slate-500">{log.actorEmail || log.actorId || 'n/a'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-(--dark-blue) whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-(--dark-blue)">
                    <div className="font-medium">{log.entityType}</div>
                    <div className="text-xs text-slate-500">{log.entityId || 'n/a'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-(--dark-blue)">
                    <div className="max-w-sm truncate" title={log.description || 'No description provided.'}>
                      {log.description || 'No description provided.'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-(--dark-blue)">
                    <DetailsPopover log={log} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
