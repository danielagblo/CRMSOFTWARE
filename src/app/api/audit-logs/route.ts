import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, type PrismaWithAuditLog } from '@/lib/prisma'

type AuditLogPayload = {
  action?: string
  description?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

type AuthenticatedUser = {
  id: string
  name: string
  email: string | null
  role: string
}

const auditDb = prisma as PrismaWithAuditLog

async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name || 'Unknown',
      email: session.user.email || null,
      role: session.user.role || 'SALES',
    }
  }

  const headerUserId = request.headers.get('X-User-Id')
  if (!headerUserId || headerUserId === 'undefined' || headerUserId === 'null') {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: headerUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as AuditLogPayload
    if (!body?.action || typeof body.action !== 'string') {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 })
    }

    const entry = await auditDb.auditLog.create({
      data: {
        action: body.action,
        description: body.description || null,
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        metadata: body.metadata || undefined,
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actorId = searchParams.get('actorId')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const query = searchParams.get('query')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(Math.max(Number(limitParam) || 200, 1), 500)

    const whereClause: any = {}
    if (actorId) whereClause.actorId = actorId
    if (action) whereClause.action = action
    if (entityType) whereClause.entityType = entityType
    if (entityId) whereClause.entityId = entityId

    if (query) {
      whereClause.OR = [
        { action: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { actorName: { contains: query, mode: 'insensitive' } },
        { actorEmail: { contains: query, mode: 'insensitive' } },
        { entityType: { contains: query, mode: 'insensitive' } },
        { entityId: { contains: query, mode: 'insensitive' } },
      ]
    }

    const logs = await auditDb.auditLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
