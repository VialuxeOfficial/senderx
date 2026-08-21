import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmail } from '@/lib/ai-provider'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId, senderId } = body

    if (!leadId || !senderId) {
      return NextResponse.json({ error: 'leadId and senderId required' }, { status: 400 })
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const generated = await generateEmail({
      leadFirstName: lead.firstName || undefined,
      leadLastName: lead.lastName || undefined,
      leadCompany: lead.company || undefined,
      leadTitle: lead.title || undefined,
      leadWebsite: lead.website || undefined,
      icp: lead.campaign?.icp || undefined,
      promptContext: lead.campaign?.promptContext || undefined,
      systemInstruction: lead.campaign?.systemInstruction || undefined,
      campaignName: lead.campaign?.name,
    })

    const fullBody = `${generated.greeting}\n\n${generated.body}\n\n${generated.cta}`
    const plainText = `${fullBody}\n\n${generated.signature}`
    const htmlContent = `<div>${generated.greeting}</div><br/><div>${generated.body}</div><br/><div>${generated.cta}</div><br/><div>${generated.signature}</div>`

    const emailRecord = await db.email.create({
      data: {
        leadId: lead.id,
        senderId,
        subject: generated.subject,
        greeting: generated.greeting,
        body: generated.body,
        cta: generated.cta,
        signature: generated.signature,
        plainText,
        htmlContent,
        status: 'draft',
        sequenceRole: 'initial',
        sequenceStep: 0,
      },
    })

    return NextResponse.json(emailRecord, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
