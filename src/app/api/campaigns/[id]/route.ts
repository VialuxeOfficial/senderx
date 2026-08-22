export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Obtener los detalles de una campaña específica por su ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la campaña es requerido' },
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
        { error: 'Campaña no encontrada' },
        { status: 404 }
      )
    }

    // Aplanar / mapear senders para compatibilidad con el frontend
    const senders = (campaign.campaignSenders || []).map((cs: any) => cs.sender)

    return NextResponse.json({
      ...campaign,
      senders,
    })
  } catch (error: any) {
    console.error('Error GET /api/campaigns/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al obtener la campaña' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar dinámicamente los campos de la campaña (ICP, Prompts, Sender, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id
    const body = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la campaña es requerido' },
        { status: 400 }
      )
    }

    const {
      name,
      status,
      icp,
      promptContext,
      systemInstruction,
      qualifyPrompt,
      sequencePrompt,
      senderName,
      senderEmail,
      followup1,
      followUp1Days,
      followup2,
      followUp2Days,
      followup3,
      followUp3Days,
      sequenceConfig,
      abEnabled,
      sendingWindowStart,
      sendingWindowEnd,
      timezone,
      skipWeekends,
    } = body

    const updateData: Record<string, any> = {}

    if (name !== undefined) updateData.name = name
    if (status !== undefined) updateData.status = status
    if (icp !== undefined) updateData.icp = icp
    if (promptContext !== undefined) updateData.promptContext = promptContext
    if (systemInstruction !== undefined) updateData.systemInstruction = systemInstruction
    if (qualifyPrompt !== undefined) updateData.qualifyPrompt = qualifyPrompt
    if (sequencePrompt !== undefined) updateData.sequencePrompt = sequencePrompt
    if (senderName !== undefined) updateData.senderName = senderName
    if (senderEmail !== undefined) updateData.senderEmail = senderEmail
    if (followup1 !== undefined) updateData.followup1 = followup1
    if (followUp1Days !== undefined) updateData.followUp1Days = Number(followUp1Days)
    if (followup2 !== undefined) updateData.followup2 = followup2
    if (followUp2Days !== undefined) updateData.followUp2Days = Number(followUp2Days)
    if (followup3 !== undefined) updateData.followup3 = followup3
    if (followUp3Days !== undefined) updateData.followUp3Days = Number(followUp3Days)
    if (sequenceConfig !== undefined) updateData.sequenceConfig = sequenceConfig
    if (abEnabled !== undefined) updateData.abEnabled = Boolean(abEnabled)
    if (sendingWindowStart !== undefined) updateData.sendingWindowStart = Number(sendingWindowStart)
    if (sendingWindowEnd !== undefined) updateData.sendingWindowEnd = Number(sendingWindowEnd)
    if (timezone !== undefined) updateData.timezone = timezone
    if (skipWeekends !== undefined) updateData.skipWeekends = Boolean(skipWeekends)

    const updatedCampaign = await db.campaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedCampaign)
  } catch (error: any) {
    console.error('Error PATCH /api/campaigns/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar la campaña' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar la campaña y sus registros vinculados
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la campaña es requerido' },
        { status: 400 }
      )
    }

    await db.campaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Campaña eliminada correctamente' })
  } catch (error: any) {
    console.error('Error DELETE /api/campaigns/[id]:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar la campaña' },
      { status: 500 }
    )
  }
}