import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ASSIGN_ALL_USERS_VALUE = '__ALL_USERS__'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const headerUserId = request.headers.get('X-User-Id')
  if (headerUserId && headerUserId !== 'undefined' && headerUserId !== 'null') {
    return headerUserId
  }

  const session = await getServerSession(authOptions)
  const sessionUserId = session?.user?.id
  if (!sessionUserId || sessionUserId === 'undefined' || sessionUserId === 'null') {
    return null
  }

  return sessionUserId
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const leads = await prisma.lead.findMany({
      where: user.role === 'ADMIN' ? undefined : {
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

    return NextResponse.json(leads)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientName, companyName, leadSource, phone, email, serviceType, serviceCategory, serviceInterested, dealValue, notes, assignedTo } = await request.json()
    if (!clientName?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Client name and phone are required' }, { status: 400 })
    }

    const parsedDealValue = dealValue ? parseFloat(dealValue) : null
    if (parsedDealValue !== null && Number.isNaN(parsedDealValue)) {
      return NextResponse.json({ error: 'Deal value must be a valid number' }, { status: 400 })
    }

    const assignToAllUsers = assignedTo === ASSIGN_ALL_USERS_VALUE
    const assignedUserId = assignToAllUsers ? userId : (assignedTo || userId)

    await ensureUserExists(userId)
    await ensureUserExists(assignedUserId)

    const lead = await prisma.lead.create({
      data: {
        clientName,
        companyName,
        leadSource,
        phone,
        email: email || '',
        serviceType,
        serviceCategory,
        serviceInterested,
        dealValue: parsedDealValue,
        notes,
        assignedTo: assignedUserId,
        visibleToAll: assignToAllUsers,
        createdBy: userId,
        stage: 'FIND_LEADS'
      },
      include: {
        assignedUser: true
      }
    })

    return NextResponse.json(lead)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}