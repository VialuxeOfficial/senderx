import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  icp: z.string().optional(),
  promptContext: z.string().optional(),
  systemInstruction: z.string().optional(),
  abEnabled: z.boolean().optional(),
  sendingWindowStart: z.number().optional(),
  sendingWindowEnd: z.number().optional(),
  timezone: z.string().optional(),
  skipWeekends: z.boolean().optional(),
})

export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true, campaignSenders: true } },
      },
    })
    return NextResponse.json(campaigns)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const campaign = await db.campaign.create({ data })
    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
