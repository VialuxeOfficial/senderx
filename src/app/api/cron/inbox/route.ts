export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncInbox } from '@/lib/inbox-sync'

export async function POST() {
  try {
    const senders = await db.sender.findMany({ where: { isActive: true } })

    let totalReplies = 0
    let totalBounces = 0
    const errors: string[] = []

    for (const sender of senders) {
      try {
        const result = await syncInbox(sender)
        totalReplies += result.repliesFound
        totalBounces += result.bouncesFound
      } catch (error) {
        errors.push(`Sender ${sender.email}: ${error}`)
      }
    }

    return NextResponse.json({
      repliesFound: totalReplies,
      bouncesFound: totalBounces,
      sendersProcessed: senders.length,
      errors: errors.length ? errors : undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Cron inbox sync failed' }, { status: 500 })
  }
}
