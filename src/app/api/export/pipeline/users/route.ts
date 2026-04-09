import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('X-User-Id')
}

const stageLabels: Record<string, string> = {
  FIND_LEADS: 'Find Leads',
  CONTACT_CLIENT: 'Contact Client',
  PRESENT_SERVICE: 'Present Service',
  NEGOTIATE: 'Negotiate',
  CLOSE_DEAL: 'Close Deal',
  PAYMENT: 'Payment',
  CLIENT_RETENTION: 'Client Retention'
}

function parseStageJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function htmlEscape(value: unknown): string {
  const str = String(value ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-')
}

function buildUserDoc(userName: string, userEmail: string, leads: any[]): string {
  const leadSections = leads
    .map((lead, index) => {
      const stageRows = lead.stageData
        .map((entry: any) => {
          const parsed = parseStageJson(entry.data)
          const fieldRows = Object.entries(parsed)
            .map(
              ([key, value]) =>
                `<tr><td class="field">${htmlEscape(key)}</td><td>${htmlEscape(text(value))}</td></tr>`
            )
            .join('')

          return `
            <div class="stage-card">
              <h4>${htmlEscape(stageLabels[entry.stage] || entry.stage)}</h4>
              <p class="meta">Entry ID: ${htmlEscape(entry.id)} | Updated: ${htmlEscape(entry.updatedAt.toISOString())}</p>
              <table>
                <thead><tr><th>Field</th><th>Value</th></tr></thead>
                <tbody>${fieldRows || '<tr><td class="field">Data</td><td>-</td></tr>'}</tbody>
              </table>
            </div>
          `
        })
        .join('')

      return `
        <section class="lead-section">
          <h2>${index + 1}. ${htmlEscape(lead.clientName)}</h2>
          <table class="summary">
            <tbody>
              <tr><td class="field">Lead ID</td><td>${htmlEscape(lead.id)}</td></tr>
              <tr><td class="field">Company</td><td>${htmlEscape(text(lead.companyName))}</td></tr>
              <tr><td class="field">Phone</td><td>${htmlEscape(text(lead.phone))}</td></tr>
              <tr><td class="field">Email</td><td>${htmlEscape(text(lead.email))}</td></tr>
              <tr><td class="field">Service Interested</td><td>${htmlEscape(text(lead.serviceInterested))}</td></tr>
              <tr><td class="field">Deal Value</td><td>${htmlEscape(text(lead.dealValue))}</td></tr>
              <tr><td class="field">Current Stage</td><td>${htmlEscape(stageLabels[lead.stage] || lead.stage)}</td></tr>
              <tr><td class="field">Assigned User</td><td>${htmlEscape(text(lead.assignedUser?.name))} (${htmlEscape(text(lead.assignedUser?.email))})</td></tr>
              <tr><td class="field">Created At</td><td>${htmlEscape(lead.dateCreated.toISOString())}</td></tr>
              <tr><td class="field">Updated At</td><td>${htmlEscape(lead.updatedAt.toISOString())}</td></tr>
              <tr><td class="field">Stage Entries</td><td>${htmlEscape(lead.stageData.length)}</td></tr>
            </tbody>
          </table>
          <h3>Pipeline Stage History</h3>
          ${stageRows || '<p>No stage history found.</p>'}
        </section>
      `
    })
    .join('')

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { margin: 0 0 8px; }
          .subtitle { color: #4b5563; margin-bottom: 20px; }
          .lead-section { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .summary, table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td, th { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .field { width: 220px; font-weight: 600; }
          .stage-card { margin-top: 14px; }
          .stage-card h4 { margin-bottom: 4px; }
          .meta { color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>CRM Pipeline Report - ${htmlEscape(userName)}</h1>
        <p class="subtitle">User Email: ${htmlEscape(userEmail)} | Exported: ${htmlEscape(new Date().toISOString())} | Total Leads: ${htmlEscape(leads.length)}</p>
        ${leadSections || '<p>No leads found for this user.</p>'}
      </body>
    </html>
  `
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Export all leads created by this user, grouped by assigned user pipeline.
    const leads = await prisma.lead.findMany({
      where: { createdBy: userId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true }
        },
        stageData: {
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: [{ assignedTo: 'asc' }, { dateCreated: 'desc' }]
    })

    const grouped = new Map<string, any[]>()
    for (const lead of leads) {
      const key = lead.assignedUser?.id || 'unassigned'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(lead)
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const files = Array.from(grouped.values()).map((userLeads) => {
      const userName = userLeads[0]?.assignedUser?.name || 'unassigned'
      const userEmail = userLeads[0]?.assignedUser?.email || '-'
      const filename = `pipeline-${safeFilename(userName)}-${timestamp}.doc`
      return {
        filename,
        mimeType: 'application/msword; charset=utf-8',
        content: buildUserDoc(userName, userEmail, userLeads)
      }
    })

    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export user pipeline files' }, { status: 500 })
  }
}
