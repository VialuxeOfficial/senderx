import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const senders = await db.campaignSender.findMany({
      where: { campaignId: id },
      include: { sender: true },
    })
    return NextResponse.json(senders)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch senders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { senderIds }: { senderIds: string[] } = body

    // Delete existing and recreate
    await db.campaignSender.deleteMany({ where: { campaignId: id } })

    const data = senderIds.map((senderId: string) => ({
      campaignId: id,
      senderId,
    }))

    const result = await db.campaignSender.createMany({ data, skipDuplicates: true })
    return NextResponse.json({ assigned: result.count }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign senders' }, { status: 500 })
  }
}
