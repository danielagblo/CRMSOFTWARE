import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leads = await prisma.lead.findMany({
      where: {
        createdBy: session.user?.id
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
    const session = await getServerSession(authOptions)
    if (!session) {
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
        assignedTo: assignedTo || session.user?.id,
        createdBy: session.user?.id,
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