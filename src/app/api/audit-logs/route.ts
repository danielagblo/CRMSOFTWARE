import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

async function getAdminFromRequest(request?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role === 'ADMIN') {
    return session.user
  }

  if (!request) return null
  const headerUserId = request.headers.get('X-User-Id')
  if (!headerUserId || headerUserId === 'undefined' || headerUserId === 'null') {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: headerUserId },
    select: { id: true, role: true }
  })

  if (!user || user.role !== 'ADMIN') {
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminFromRequest(request)
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined
    const action = searchParams.get('action') || undefined
    const query = searchParams.get('query') || undefined
    const limitParam = Number(searchParams.get('limit') || '50')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50
    const pageParam = Number(searchParams.get('page') || '1')
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
    const skip = (page - 1) * limit

    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(query
        ? {
            OR: [
              { actorName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { actorEmail: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { action: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { entityType: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { entityId: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: query, mode: Prisma.QueryMode.insensitive } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
