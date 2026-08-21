import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const status = searchParams.get('status')
    const qualified = searchParams.get('qualified')

    const where: any = {}
    if (campaignId) where.campaignId = campaignId
    if (status) where.status = status
    if (qualified === 'true') where.icpScore = { gte: 60 }
    if (qualified === 'false') where.icpScore = { lt: 60 }

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(leads)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
