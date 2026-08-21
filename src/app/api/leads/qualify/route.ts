import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { qualifyLead } from '@/lib/ai-provider'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const result = await qualifyLead({
      leadEmail: lead.email,
      leadFirstName: lead.firstName || undefined,
      leadLastName: lead.lastName || undefined,
      leadCompany: lead.company || undefined,
      leadTitle: lead.title || undefined,
      leadWebsite: lead.website || undefined,
      icp: lead.campaign?.icp || undefined,
    })

    // Update lead with qualification
    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        icpScore: result.score,
        icpReason: result.reason,
        status: result.score >= 60 ? 'qualified' : 'disqualified',
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Qualification failed' }, { status: 500 })
  }
}
