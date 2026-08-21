import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const email = await db.email.findUnique({
      where: { id },
      include: { lead: true, sender: true },
    })
    if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(email)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const email = await db.email.update({ where: { id }, data: body })
    return NextResponse.json(email)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
  }
}
