import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { leads } = await req.json()

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No se enviaron leads válidos' }, { status: 400 })
    }

    const createdLeads = []

    for (const lead of leads) {
      if (!lead.email) continue

      const saved = await db.lead.create({
        data: {
          campaignId,
          email: lead.email,
          firstName: lead.firstName || lead.name || '',
          company: lead.company || '',
          title: lead.title || '',
          linkedin: lead.linkedin || '',
          status: 'pending',
        },
      })
      createdLeads.push(saved)
    }

    return NextResponse.json({ success: true, count: createdLeads.length }, { status: 201 })
  } catch (error) {
    console.error('Error al importar leads:', error)
    return NextResponse.json({ error: 'Error al procesar leads' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leads = await db.lead.findMany({
      where: { campaignId: params.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(leads)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener leads' }, { status: 500 })
  }
}