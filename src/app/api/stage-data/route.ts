import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
  if (!userId || userId === 'undefined' || userId === 'null') return null
  return userId
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getPaymentAmount(data: Record<string, unknown>): number | null {
  return toNumber(data.amountReceived ?? data.paymentAmount)
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId, stage, data, stageDataId } = await request.json()

    if (!leadId || !stage || !data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    // Verify that the lead belongs to the authenticated user
    const lead = await prisma.lead.findFirst({
      where: user?.role === 'ADMIN' ? { id: leadId } : {
        id: leadId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId }
        ]
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    if (stage === 'PAYMENT') {
      if (!lead.dealValue || lead.dealValue <= 0) {
        return NextResponse.json(
          { error: 'Set the agreed contract value in Close Deal before recording payments.' },
          { status: 400 }
        )
      }

      const paymentAmount = getPaymentAmount(data)
      if (paymentAmount === null || paymentAmount <= 0) {
        return NextResponse.json(
          { error: 'Enter a valid payment amount greater than zero.' },
          { status: 400 }
        )
      }

      const existingPaymentEntries = await prisma.stageData.findMany({
        where: { leadId, stage: 'PAYMENT' }
      })

      const currentTotalPaid = existingPaymentEntries.reduce((sum, entry) => {
        if (stageDataId && entry.id === stageDataId) return sum
        try {
          const parsedData = JSON.parse(entry.data)
          return sum + (getPaymentAmount(parsedData) || 0)
        } catch {
          return sum
        }
      }, 0)

      const totalPaidToDate = currentTotalPaid + paymentAmount
      if (totalPaidToDate > lead.dealValue) {
        return NextResponse.json(
          {
            error: `Total payments (GHS ${totalPaidToDate.toLocaleString()}) exceed agreed amount (GHS ${lead.dealValue.toLocaleString()}).`
          },
          { status: 400 }
        )
      }

      const remainingBalance = lead.dealValue - totalPaidToDate
      data.amountReceived = paymentAmount
      data.totalPaidToDate = totalPaidToDate
      data.remainingBalance = remainingBalance
      data.paymentStatus = remainingBalance === 0 ? 'Paid in Full' : 'Partial Payment'
    }

    let stageData

    if (stageDataId) {
      const existing = await prisma.stageData.findFirst({
        where: {
          id: stageDataId,
          leadId
        }
      })

      if (!existing) {
        return NextResponse.json({ error: 'Stage entry not found' }, { status: 404 })
      }

      stageData = await prisma.stageData.update({
        where: { id: stageDataId },
        data: {
          stage,
          data: JSON.stringify(data),
          updatedAt: new Date()
        }
      })
    } else {
      // Create a new stage entry to preserve full history/reference.
      stageData = await prisma.stageData.create({
        data: {
          leadId,
          stage,
          data: JSON.stringify(data)
        }
      })
    }

    // If this is CLOSE_DEAL stage and contractValue is provided, update the lead's dealValue
    if (stage === 'CLOSE_DEAL' && data.contractValue) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          dealValue: parseFloat(data.contractValue)
        }
      })
    }

    const paymentSummary = stage === 'PAYMENT'
      ? {
          agreedAmount: lead.dealValue,
          totalPaidToDate: Number(data.totalPaidToDate || 0),
          remainingBalance: Number(data.remainingBalance || 0),
          paymentStatus: data.paymentStatus || ''
        }
      : null

    return NextResponse.json({ success: true, stageData, paymentSummary })
  } catch (error) {
    console.error('Error saving stage data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const stage = searchParams.get('stage')

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    // Verify that the lead belongs to the authenticated user
    const lead = await prisma.lead.findFirst({
      where: user?.role === 'ADMIN' ? { id: leadId } : {
        id: leadId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId }
        ]
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    const whereClause: { leadId: string; stage?: string } = { leadId }

    if (stage) {
      whereClause.stage = stage
    }

    const stageData = await prisma.stageData.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    })

    // Parse the JSON data
    const parsedData = stageData.map(item => ({
      ...item,
      data: JSON.parse(item.data)
    }))

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('Error fetching stage data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}