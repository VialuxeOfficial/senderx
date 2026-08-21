import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateFollowupTemplate } from '@/lib/ai-provider'
import { autoBackup } from '@/lib/auto-backup'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Auto-backup before generating
    await autoBackup('pre-sequence-generate')

    // Get the initial email template (first email in the campaign)
    const firstEmail = await db.email.findFirst({
      where: { lead: { campaignId: id }, sequenceRole: 'initial' },
      orderBy: { createdAt: 'desc' },
    })

    const originalSubject = firstEmail?.subject || campaign.name
    const originalBody = firstEmail?.body || ''

    // Generate 3 follow-ups
    const [followup1, followup2, followup3] = await Promise.all([
      generateFollowupTemplate({
        originalSubject,
        originalBody,
        step: 1,
        icp: campaign.icp || undefined,
        promptContext: campaign.promptContext || undefined,
        systemInstruction: campaign.systemInstruction || undefined,
      }),
      generateFollowupTemplate({
        originalSubject,
        originalBody,
        step: 2,
        icp: campaign.icp || undefined,
        promptContext: campaign.promptContext || undefined,
        systemInstruction: campaign.systemInstruction || undefined,
      }),
      generateFollowupTemplate({
        originalSubject,
        originalBody,
        step: 3,
        icp: campaign.icp || undefined,
        promptContext: campaign.promptContext || undefined,
        systemInstruction: campaign.systemInstruction || undefined,
      }),
    ])

    // Save to campaign
    const updated = await db.campaign.update({
      where: { id },
      data: { followup1, followup2, followup3 },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate sequence' }, { status: 500 })
  }
}
