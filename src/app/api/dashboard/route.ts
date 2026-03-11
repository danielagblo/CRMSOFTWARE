import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const totalLeads = await prisma.lead.count({
      where: {
        createdBy: userId
      }
    })
    const leadsInProgress = await prisma.lead.count({
      where: {
        createdBy: userId,
        stage: {
          not: 'CLIENT_RETENTION'
        }
      }
    })
    const dealsClosed = await prisma.lead.count({
      where: {
        createdBy: userId,
        stage: 'PAYMENT'
      }
    })

    const totalRevenue = await prisma.lead.aggregate({
      where: {
        createdBy: userId,
        stage: 'PAYMENT'
      },
      _sum: {
        dealValue: true
      }
    })

    const totalCommissionPaid = await prisma.commission.aggregate({
      where: {
        lead: {
          createdBy: userId
        },
        status: 'PAID'
      },
      _sum: {
        earned: true
      }
    })

    const pipelineData = await prisma.lead.groupBy({
      by: ['stage'],
      where: {
        createdBy: userId
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      totalLeads,
      leadsInProgress,
      dealsClosed,
      totalRevenue: totalRevenue._sum.dealValue || 0,
      totalCommissionPaid: totalCommissionPaid._sum.earned || 0,
      pipelineData: pipelineData.map(item => ({
        stage: item.stage,
        count: item._count.id
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}