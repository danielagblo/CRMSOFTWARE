import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequestAuditContext, recordAuditLogForUser } from '@/lib/audit'

type ContactRecord = {
  id: string
  name: string
  phone: string
  email: string | null
  location: string | null
  businessType: string | null
  note: string | null
  createdAt: Date
}

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

    const db = prisma as any
    const contacts = (await db.contact.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })) as ContactRecord[]

    return NextResponse.json(
      contacts.map((contact) => ({
        ...contact,
        createdAt: contact.createdAt.toISOString()
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const { name, phone, email, location, businessType, note } = await request.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and number are required.' }, { status: 400 })
    }

    const db = prisma as any
    const createdContact = await db.contact.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        location: location?.trim() || null,
        businessType: businessType?.trim() || null,
        note: note?.trim() || null,
        createdBy: userId
      }
    })

    const auditContext = getRequestAuditContext(request)
    await recordAuditLogForUser(
      prisma,
      userId,
      {
        action: 'CREATE',
        entityType: 'Contact',
        entityId: createdContact.id,
        description: `Created contact ${createdContact.name}`,
        ...auditContext
      },
      'Failed to write contact audit log:'
    )

    return NextResponse.json({
      ...createdContact,
      createdAt: createdContact.createdAt.toISOString()
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const { id, name, phone, email, location, businessType, note } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
    }

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and number are required.' }, { status: 400 })
    }

    const db = prisma as any
    
    // Verify the contact belongs to the current user (prevent horizontal privilege escalation)
    const existingContact = await db.contact.findFirst({
      where: { id, createdBy: userId }
    })
    
    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found or access denied.' }, { status: 404 })
    }

    const updatedContact = await db.contact.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        location: location?.trim() || null,
        businessType: businessType?.trim() || null,
        note: note?.trim() || null
      }
    })

    const auditContext = getRequestAuditContext(request)
    await recordAuditLogForUser(
      prisma,
      userId,
      {
        action: 'UPDATE',
        entityType: 'Contact',
        entityId: updatedContact.id,
        description: `Updated contact ${updatedContact.name}`,
        ...auditContext
      },
      'Failed to write contact audit log:'
    )

    return NextResponse.json({
      ...updatedContact,
      createdAt: updatedContact.createdAt.toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update contact.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(userId)
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
    }

    const db = prisma as any
    
    // Verify the contact belongs to the current user (prevent horizontal privilege escalation)
    const existingContact = await db.contact.findFirst({
      where: { id, createdBy: userId }
    })
    
    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found or access denied.' }, { status: 404 })
    }

    await db.contact.delete({
      where: { id }
    })

    const auditContext = getRequestAuditContext(request)
    await recordAuditLogForUser(
      prisma,
      userId,
      {
        action: 'DELETE',
        entityType: 'Contact',
        entityId: id,
        description: `Deleted contact ${id}`,
        ...auditContext
      },
      'Failed to write contact audit log:'
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete contact.' }, { status: 500 })
  }
}
