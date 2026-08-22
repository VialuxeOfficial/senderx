export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolver params de forma segura tanto para Next.js 14 como 15
    const resolvedParams = await Promise.resolve(context.params)
    const id = resolvedParams?.id

    console.log('GET /api/campaigns/[id] ID recibido:', id)

    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'ID de campaña no especificado' },
        { status: 400 }
      )
    }

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        campaignSenders: {
          include: {
            sender: true,
          },
        },
        leads: true,
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: `No se encontró la campaña con ID: ${id}` },
        { status: 404 }
      )
    }

    // Adaptar la estructura para el frontend
    const senders = (campaign.campaignSenders || []).map((cs: any) => cs.sender)

    return NextResponse.json({
      ...campaign,
      senders,
      emails: campaign.emails || [],
      leads: campaign.leads || [],
    })
  } catch (error: any) {
    console.error('Error crítico en GET /api/campaigns/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno al consultar la base de datos' },
      { status: 500 }
    )
  }
}