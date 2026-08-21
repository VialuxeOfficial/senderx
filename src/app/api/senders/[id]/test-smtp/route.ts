export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testSmtpConnection } from '@/lib/email-sender'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sender = await db.sender.findUnique({ where: { id } })
    if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 })

    const result = await testSmtpConnection({
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      smtpUser: sender.smtpUser,
      smtpPass: sender.smtpPass,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Test failed' }, { status: 500 })
  }
}
