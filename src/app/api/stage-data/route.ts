import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId, stage, data } = await request.json()

    if (!leadId || !stage || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify that the lead belongs to the authenticated user
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        createdBy: session.user?.id
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    // Upsert the stage data (create if doesn't exist, update if exists)
    const stageData = await prisma.stageData.upsert({
      where: {
        leadId_stage: {
          leadId,
          stage
        }
      },
      update: {
        data: JSON.stringify(data),
        updatedAt: new Date()
      },
      create: {
        leadId,
        stage,
        data: JSON.stringify(data)
      }
    })

    // If this is CLOSE_DEAL stage and contractValue is provided, update the lead's dealValue
    if (stage === 'CLOSE_DEAL' && data.contractValue) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          dealValue: parseFloat(data.contractValue)
        }
      })
    }

    return NextResponse.json({ success: true, stageData })
  } catch (error) {
    console.error('Error saving stage data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const stage = searchParams.get('stage')

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    // Verify that the lead belongs to the authenticated user
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        createdBy: session.user?.id
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    let whereClause: any = { leadId }

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