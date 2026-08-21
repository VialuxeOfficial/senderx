import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sender = await db.sender.findUnique({ where: { id } })
    if (!sender) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(sender)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sender' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const sender = await db.sender.update({ where: { id }, data: body })
    return NextResponse.json(sender)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update sender' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.sender.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete sender' }, { status: 500 })
  }
}
