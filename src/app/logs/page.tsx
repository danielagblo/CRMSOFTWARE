import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import PageHeader from '@/components/PageHeader'
import AuditLogsTable from '@/components/AuditLogsTable'
import { authOptions } from '@/lib/auth'
import { prisma, type PrismaWithAuditLog } from '@/lib/prisma'

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

export default async function LogsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/pipeline')
  }

  const query = firstValue(resolvedSearchParams?.query)?.trim() || ''
  const action = firstValue(resolvedSearchParams?.action)?.trim() || ''
  const entityType = firstValue(resolvedSearchParams?.entityType)?.trim() || ''
  const page = Math.max(Number(firstValue(resolvedSearchParams?.page) || '1') || 1, 1)
  const limit = LIMIT_OPTIONS.includes(Number(firstValue(resolvedSearchParams?.limit) || '50'))
    ? Number(firstValue(resolvedSearchParams?.limit) || '50')
    : 50
  const skip = (page - 1) * limit
  const auditDb = prisma as PrismaWithAuditLog

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
    auditDb.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    auditDb.auditLog.count({ where }),
  ])

  const typedLogs = logs as AuditLogRow[]
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const prevPage = Math.max(page - 1, 1)
  const nextPage = Math.min(page + 1, totalPages)
  const prevHref = `/logs${buildQueryString(resolvedSearchParams || {}, { page: String(prevPage) })}`
  const nextHref = `/logs${buildQueryString(resolvedSearchParams || {}, { page: String(nextPage) })}`

  return (
    <div className="min-h-screen bg-(--light-blue)/45">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 sm:px-0 space-y-4">
          <PageHeader
            eyebrow="Audit"
            title="Site Logs"
            description="Filter, search, and inspect operational events across the CRM."
          />

          <div className="theme-surface rounded-2xl shadow-sm border overflow-visible">
            <form method="get" className="grid gap-3 px-6 py-4 border-b theme-border bg-(--surface-muted) rounded-t-2xl shadow-sm lg:grid-cols-5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide theme-text-subtle mb-1">
                  Search
                </label>
                <input
                  name="query"
                  defaultValue={query}
                  placeholder="Search actor, action, entity, description..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide theme-text-subtle mb-1">
                  Action
                </label>
                <select
                  name="action"
                  defaultValue={action}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
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
                <label className="block text-xs font-semibold uppercase tracking-wide theme-text-subtle mb-1">
                  Entity
                </label>
                <select
                  name="entityType"
                  defaultValue={entityType}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
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
                <label className="block text-xs font-semibold uppercase tracking-wide theme-text-subtle mb-1">
                  Page size
                </label>
                <select
                  name="limit"
                  defaultValue={String(limit)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
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
                  className="rounded-lg bg-(--dark-blue) px-4 py-2.5 text-sm font-medium text-(--white) shadow-sm transition-colors hover:bg-(--dark-blue)/85"
                >
                  Apply Filters
                </button>
                <Link
                  href="/logs"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-(--dark-blue) hover:bg-slate-50 transition-colors"
                >
                  Reset
                </Link>
                <p className="text-sm theme-text-muted">
                  Showing {typedLogs.length} of {total} logs
                </p>
              </div>
            </form>

            <AuditLogsTable
              logs={typedLogs}
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={prevHref}
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
                href={nextHref}
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
