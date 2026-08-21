export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email-sender'

export async function POST() {
  try {
    // Get all queued emails
    const queuedEmails = await db.email.findMany({
      where: { status: 'queued' },
      include: { lead: true, sender: true },
      take: 50,
      orderBy: { createdAt: 'asc' },
    })

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const email of queuedEmails) {
      // Check sending window via campaign
      const lead = email.lead
      const campaign = await db.campaign.findUnique({ where: { id: lead.campaignId } })

      if (campaign) {
        const now = new Date()
        const hour = now.getHours()

        // Skip weekends
        if (campaign.skipWeekends) {
          const day = now.getDay()
          if (day === 0 || day === 6) { skipped++; continue }
        }

        // Skip outside window
        if (hour < campaign.sendingWindowStart || hour >= campaign.sendingWindowEnd) {
          skipped++
          continue
        }
      }

      // Send the email
      const result = await sendEmail({
        senderId: email.senderId,
        to: email.lead.email,
        subject: email.subject,
        plainText: email.plainText || email.body,
        htmlContent: email.htmlContent || '',
        inReplyTo: email.inReplyTo || undefined,
        references: email.references || undefined,
        campaignId: lead.campaignId,
      })

      if (result.success) {
        sent++
        await db.email.update({
          where: { id: email.id },
          data: { status: 'sent', sentAt: new Date() },
        })
        await db.lead.update({
          where: { id: email.leadId },
          data: { status: 'sent' },
        })
      } else {
        failed++
        await db.email.update({
          where: { id: email.id },
          data: { status: 'failed', errorMessage: result.error },
        })
      }
    }

    return NextResponse.json({ sent, failed, skipped, total: queuedEmails.length })
  } catch (error) {
    return NextResponse.json({ error: 'Cron send failed' }, { status: 500 })
  }
}
