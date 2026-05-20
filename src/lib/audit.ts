import { Prisma, PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

type AuditLogInput = {
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  description?: string | null
  metadata?: Prisma.InputJsonValue | null
  ipAddress?: string | null
  userAgent?: string | null
}

export function getRequestAuditContext(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

  return {
    ipAddress,
    userAgent: request.headers.get('user-agent')
  }
}

export async function recordAuditLog(db: PrismaClient | Prisma.TransactionClient, input: AuditLogInput) {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    }
  })
}

export async function recordAuditLogForUser(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  input: Omit<AuditLogInput, 'actorId' | 'actorName' | 'actorEmail'>,
  errorMessage = 'Failed to write audit log:'
) {
  const actor = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true }
  })

  if (!actor) return

  try {
    await recordAuditLog(db, {
      ...input,
      actorId: userId,
      actorName: actor.name,
      actorEmail: actor.email
    })
  } catch (error) {
    console.error(errorMessage, error)
  }
}
