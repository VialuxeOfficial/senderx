import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  icp: z.string().optional().nullable(),
  promptContext: z.string().optional().nullable(),
  systemInstruction: z.string().optional().nullable(),
  abTesting: z.boolean().optional(),
  abEnabled: z.boolean().optional(),
  sendingWindowStart: z.union([z.string(), z.number()]).optional(),
  sendingWindowEnd: z.union([z.string(), z.number()]).optional(),
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
    
    // Normalizar tipos antes de la validación
    const parsedData = createSchema.parse({
      ...body,
      sendingWindowStart: String(body.sendingWindowStart || '9'),
      sendingWindowEnd: String(body.sendingWindowEnd || '18'),
    })

    const campaign = await db.campaign.create({
      data: {
        name: parsedData.name,
        icp: parsedData.icp || '',
        promptContext: parsedData.promptContext || '',
        systemInstruction: parsedData.systemInstruction || '',
        abEnabled: parsedData.abTesting ?? parsedData.abEnabled ?? false,
        sendingWindowStart: parseInt(String(parsedData.sendingWindowStart)) || 9,
        sendingWindowEnd: parseInt(String(parsedData.sendingWindowEnd)) || 18,
        timezone: parsedData.timezone || 'UTC',
        skipWeekends: parsedData.skipWeekends ?? true,
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Error al crear campaña:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}