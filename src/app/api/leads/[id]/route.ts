import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ASSIGN_ALL_USERS_VALUE = '__ALL_USERS__'

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
  if (!userId || userId === 'undefined' || userId === 'null') return null
  return userId
}

async function ensureUserExists(userId: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: userId,
        name: `User ${userId.slice(0, 6)}`,
        email: `${userId}@local.crm`,
        password: 'local-auth-placeholder',
        role: 'SALES'
      }
    })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const { id } = await params
    const user = await prisma.user.findUnique({ where: { id: userId } })

    const lead = await prisma.lead.findFirst({
      where: user?.role === 'ADMIN' ? { id: id } : {
        id,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          { visibleToAll: true }
        ]
      },
      include: {
        assignedUser: true
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { stage, ...updateData } = await request.json()
    if (updateData.assignedTo && updateData.assignedTo !== ASSIGN_ALL_USERS_VALUE) {
      await ensureUserExists(updateData.assignedTo)
    }

    await ensureUserExists(userId)
    const user = await prisma.user.findUnique({ where: { id: userId } })

    // First verify that the lead belongs to the authenticated user
    const existingLead = await prisma.lead.findFirst({
      where: user?.role === 'ADMIN' ? { id: id } : {
        id: id,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          { visibleToAll: true }
        ]
      }
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    const processedUpdateData = { ...updateData }
    if ('dealValue' in processedUpdateData) {
      processedUpdateData.dealValue = processedUpdateData.dealValue ? parseFloat(processedUpdateData.dealValue) : null
    }

    if (stage) {
      processedUpdateData.stage = stage as any
    }

    if (processedUpdateData.assignedTo === '') {
      delete processedUpdateData.assignedTo
    }

    if (processedUpdateData.assignedTo === ASSIGN_ALL_USERS_VALUE) {
      processedUpdateData.assignedTo = existingLead.assignedTo
      processedUpdateData.visibleToAll = true
    } else if (typeof processedUpdateData.assignedTo === 'string') {
      processedUpdateData.visibleToAll = false
    }

    const lead = await prisma.lead.update({
      where: { id: id },
      data: processedUpdateData,
      include: {
        assignedUser: true
      }
    })

    return NextResponse.json(lead)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id } = await params

    const existingLead = await prisma.lead.findFirst({
      where: user.role === 'ADMIN' ? { id: id } : {
        id: id,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          { visibleToAll: true }
        ]
      }
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    await prisma.lead.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}