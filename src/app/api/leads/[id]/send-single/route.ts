export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmail } from '@/lib/ai-provider'
import { sendEmail } from '@/lib/email-sender'
import { autoBackup } from '@/lib/auto-backup'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
      include: { campaign: true },
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (lead.status === 'sent') return NextResponse.json({ error: 'Email already sent' }, { status: 400 })
    if (lead.status === 'bounced') return NextResponse.json({ error: 'Lead bounced' }, { status: 400 })

    // Get a sender for this campaign
    const campaignSender = await db.campaignSender.findFirst({
      where: { campaignId: lead.campaignId },
      include: { sender: true },
    })

    if (!campaignSender) return NextResponse.json({ error: 'No sender assigned to campaign' }, { status: 400 })

    const sender = campaignSender.sender

    // Generate email with AI
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

    // Build email content
    const fullBody = `${generated.greeting}\n\n${generated.body}\n\n${generated.cta}`
    const plainText = `${fullBody}\n\n${generated.signature}`
    const htmlContent = `<div>${generated.greeting}</div><br/><div>${generated.body}</div><br/><div>${generated.cta}</div><br/><div>${generated.signature}</div>`

    // Create email record
    const emailRecord = await db.email.create({
      data: {
        leadId: lead.id,
        senderId: sender.id,
        subject: generated.subject,
        greeting: generated.greeting,
        body: generated.body,
        cta: generated.cta,
        signature: generated.signature,
        plainText,
        htmlContent,
        status: 'queued',
        sequenceRole: 'initial',
        sequenceStep: 0,
      },
    })

    // Auto-backup before send
    await autoBackup('pre-send')

    // Send the email
    const result = await sendEmail({
      senderId: sender.id,
      to: lead.email,
      subject: generated.subject,
      plainText,
      htmlContent,
      campaignId: lead.campaignId,
    })

    if (result.success) {
      await db.email.update({
        where: { id: emailRecord.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          inReplyTo: result.messageId,
        },
      })
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'sent' },
      })
      return NextResponse.json({ ok: true, emailId: emailRecord.id })
    } else {
      await db.email.update({
        where: { id: emailRecord.id },
        data: { status: 'failed', errorMessage: result.error },
      })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
