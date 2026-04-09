import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        createdBy: userId
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
    if (updateData.assignedTo) {
      await ensureUserExists(updateData.assignedTo)
    }

    // First verify that the lead belongs to the authenticated user
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: id,
        createdBy: userId
      }
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    const lead = await prisma.lead.update({
      where: { id: id },
      data: {
        ...updateData,
        stage: stage as any
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