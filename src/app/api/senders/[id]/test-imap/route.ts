export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testImapConnection } from '@/lib/email-sender'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sender = await db.sender.findUnique({ where: { id } })
    if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 })

    const result = await testImapConnection({
      imapHost: sender.imapHost,
      imapPort: sender.imapPort,
      imapUser: sender.imapUser,
      imapPass: sender.imapPass,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Test failed' }, { status: 500 })
  }
}
