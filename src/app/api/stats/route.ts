import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [campaigns, leads, emails, sentEmails, openedEmails] = await Promise.all([
      db.campaign.count(),
      db.lead.count(),
      db.email.count(),
      db.email.count({ where: { status: 'sent' } }),
      db.email.count({ where: { openedAt: { not: null } } }),
    ])

    const openRate = sentEmails > 0 ? (openedEmails / sentEmails * 100).toFixed(1) : '0'

    const activeCampaigns = await db.campaign.count({ where: { status: 'active' } })
    const repliedLeads = await db.lead.count({ where: { replied: true } })
    const bouncedLeads = await db.lead.count({ where: { bounced: true } })

    return NextResponse.json({
      totalCampaigns: campaigns,
      activeCampaigns,
      totalLeads: leads,
      totalEmails: emails,
      sentEmails,
      openedEmails,
      openRate: `${openRate}%`,
      repliedLeads,
      bouncedLeads,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
