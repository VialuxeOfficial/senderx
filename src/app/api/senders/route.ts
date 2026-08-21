import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  smtpHost: z.string().min(1),
  smtpPort: z.number().default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  imapHost: z.string().min(1),
  imapPort: z.number().default(993),
  imapUser: z.string().min(1),
  imapPass: z.string().min(1),
  dailyLimit: z.number().default(25),
})

export async function GET() {
  try {
    const senders = await db.sender.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(senders)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch senders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const sender = await db.sender.create({ data })
    return NextResponse.json(sender, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create sender' }, { status: 500 })
  }
}
