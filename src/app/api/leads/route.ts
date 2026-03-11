import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to get user ID from request headers
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
  return userId
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
        assignedUser: true,
        commission: true
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

    const { clientName, companyName, phone, email, serviceInterested, dealValue, notes, assignedTo } = await request.json()

    const lead = await prisma.lead.create({
      data: {
        clientName,
        companyName,
        phone,
        email,
        serviceInterested,
        dealValue: dealValue ? parseFloat(dealValue) : null,
        notes,
        assignedTo: assignedTo || userId,
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