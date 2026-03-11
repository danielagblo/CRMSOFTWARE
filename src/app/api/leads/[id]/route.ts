import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
  return userId
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { stage, ...updateData } = await request.json()

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
        assignedUser: true,
        commission: true
      }
    })

    // If moving to PAYMENT, calculate commission
    if (stage === 'PAYMENT' && lead.dealValue && !lead.commission) {
      const commissionRate = 0.04 // 4%
      const earned = lead.dealValue * commissionRate

      await prisma.commission.create({
        data: {
          leadId: lead.id,
          amount: lead.dealValue,
          rate: commissionRate,
          earned
        }
      })
    }

    return NextResponse.json(lead)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}