import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

type SearchParams = {
  query?: string | string[]
  action?: string | string[]
  entityType?: string | string[]
  page?: string | string[]
  limit?: string | string[]
}

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ISSUE', 'DOWNLOAD', 'EXPORT']
const ENTITY_OPTIONS = ['Lead', 'Contact', 'User', 'StageData', 'Invoice', 'PipelineExport', 'PipelineExportBundle']
const LIMIT_OPTIONS = [25, 50, 100, 200]

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function buildQueryString(base: SearchParams, overrides: Partial<Record<keyof SearchParams, string | undefined>>) {
  const params = new URLSearchParams()
  const query = overrides.query ?? firstValue(base.query) ?? ''
  const action = overrides.action ?? firstValue(base.action) ?? ''
  const entityType = overrides.entityType ?? firstValue(base.entityType) ?? ''
  const page = overrides.page ?? firstValue(base.page) ?? '1'
  const limit = overrides.limit ?? firstValue(base.limit) ?? '50'

  if (query) params.set('query', query)
  if (action) params.set('action', action)
  if (entityType) params.set('entityType', entityType)
  if (page) params.set('page', page)
  if (limit) params.set('limit', limit)

  const value = params.toString()
  return value ? `?${value}` : ''
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return ''
  }

  return JSON.stringify(metadata, null, 2)
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/pipeline')
  }

  const query = firstValue(searchParams?.query)?.trim() || ''
  const action = firstValue(searchParams?.action)?.trim() || ''
  const entityType = firstValue(searchParams?.entityType)?.trim() || ''
  const page = Math.max(Number(firstValue(searchParams?.page) || '1') || 1, 1)
  const limit = LIMIT_OPTIONS.includes(Number(firstValue(searchParams?.limit) || '50'))
    ? Number(firstValue(searchParams?.limit) || '50')
    : 50
  const skip = (page - 1) * limit

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(query
      ? {
          OR: [
            { actorName: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { actorEmail: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { action: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { entityType: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { entityId: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  const typedLogs = logs as AuditLogRow[]
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const prevPage = Math.max(page - 1, 1)
  const nextPage = Math.min(page + 1, totalPages)

  return (
    <div className="min-h-screen bg-(--light-blue)/45">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 sm:px-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-sm font-medium text-indigo-600">Security</p>
              <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
              <p className="mt-1 text-sm text-slate-500">
                Filter, search, and inspect operational events across the CRM.
              </p>
            </div>

            <form method="get" className="grid gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Search
                </label>
                <input
                  name="query"
                  defaultValue={query}
                  placeholder="Search actor, action, entity, description..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Action
                </label>
                <select
                  name="action"
                  defaultValue={action}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All actions</option>
                  {ACTION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Entity
                </label>
                <select
                  name="entityType"
                  defaultValue={entityType}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All entities</option>
                  {ENTITY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Page size
                </label>
                <select
                  name="limit"
                  defaultValue={String(limit)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {LIMIT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <input type="hidden" name="page" value="1" />
              <div className="lg:col-span-5 flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Apply Filters
                </button>
                <Link
                  href="/audit-logs"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reset
                </Link>
                <p className="text-sm text-slate-500">
                  Showing {typedLogs.length} of {total} logs
                </p>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {typedLogs.length === 0 ? (
                    <tr>
                      <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                        No audit logs matched the current filters.
                      </td>
                    </tr>
                  ) : (
                    typedLogs.map((log) => (
                      <tr key={log.id} className="align-top">
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          <div>{log.createdAt.toLocaleString()}</div>
                          <div className="mt-1 text-xs text-slate-400">{log.ipAddress || 'No IP'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          <div className="font-medium">{log.actorName || 'System'}</div>
                          <div className="text-xs text-slate-500">{log.actorEmail || log.actorId || 'n/a'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="font-medium">{log.entityType}</div>
                          <div className="text-xs text-slate-500">{log.entityId || 'n/a'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div>{log.description || 'No description provided.'}</div>
                          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                              View details
                            </summary>
                            <div className="mt-3 space-y-3 text-xs text-slate-600">
                              <div>
                                <div className="font-semibold text-slate-700">User Agent</div>
                                <div className="mt-1 break-words">{log.userAgent || 'n/a'}</div>
                              </div>
                              {log.metadata ? (
                                <div>
                                  <div className="font-semibold text-slate-700">Metadata</div>
                                  <pre className="mt-1 max-w-xl overflow-x-auto rounded-lg bg-white p-3 text-[11px] leading-5 text-slate-600">
                                    {formatMetadata(log.metadata)}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/audit-logs${buildQueryString(searchParams || {}, { page: String(prevPage) })}`}
                aria-disabled={page <= 1}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  page <= 1
                    ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/audit-logs${buildQueryString(searchParams || {}, { page: String(nextPage) })}`}
                aria-disabled={page >= totalPages}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  page >= totalPages
                    ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
