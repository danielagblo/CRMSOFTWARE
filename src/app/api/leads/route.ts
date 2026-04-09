import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to get user ID from request headers
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
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

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leads = await prisma.lead.findMany({
      where: {
        createdBy: userId
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
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientName, companyName, phone, email, serviceType, serviceCategory, serviceInterested, dealValue, notes, assignedTo } = await request.json()
    const assignedUserId = assignedTo || userId

    await ensureUserExists(userId)
    await ensureUserExists(assignedUserId)

    const lead = await prisma.lead.create({
      data: {
        clientName,
        companyName,
        phone,
        email: email || '',
        serviceType,
        serviceCategory,
        serviceInterested,
        dealValue: dealValue ? parseFloat(dealValue) : null,
        notes,
        assignedTo: assignedUserId,
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