export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'El ID del lead es requerido' },
        { status: 400 }
      )
    }

    // Cargar lead junto con la campaña asociada
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        campaign: true,
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // Desestructurar de forma segura el customData
    let customData: any = {}
    try {
      if (lead.customData) {
        customData = typeof lead.customData === 'string' ? JSON.parse(lead.customData) : lead.customData
      }
    } catch {
      customData = {}
    }

    // Prompts e ICP definidos en la campaña
    const campaignIcp = lead.campaign?.icp || 'Perfil B2B general'
    const campaignPrompt =
      lead.campaign?.qualifyPrompt ||
      'Evalúa qué tan bien coincide este lead con el perfil del cliente ideal (ICP).'

    const groqApiKey = process.env.GROQ_API_KEY

    let score = 50
    let icpReason = 'Calificación base asignada automáticamente.'

    // Si la clave de Groq está configurada, ejecutamos la evaluación con IA
    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-oss-120b',
            messages: [
              {
                role: 'system',
                content: `Eres un evaluador experto de leads B2B. Instrucciones de calificación de la campaña: "${campaignPrompt}". Debes responder ÚNICAMENTE con un objeto JSON válido con este formato exacto: {"score": número_de_0_a_100, "reason": "explicación breve de 1 frase"}.`,
              },
              {
                role: 'user',
                content: `ICP Objetivo: ${campaignIcp}
Nombre: ${lead.firstName || ''} ${lead.lastName || ''}
Cargo: ${lead.title || 'N/A'}
Empresa: ${lead.company || 'N/A'}
Sitio Web: ${lead.website || 'N/A'}
Industria: ${customData.industry || 'N/A'}
Tamaño Empresa: ${customData.companySize || 'N/A'}
Biografía Persona: ${customData.aboutPerson || 'N/A'}
Biografía Empresa: ${customData.aboutCompany || 'N/A'}`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        })

        if (response.ok) {
          const aiData = await response.json()
          const parsedContent = JSON.parse(aiData.choices[0].message.content)
          score = typeof parsedContent.score === 'number' ? parsedContent.score : score
          icpReason = parsedContent.reason || icpReason
        } else {
          console.warn('Groq API devolvió un código de error:', response.status)
        }
      } catch (groqErr) {
        console.warn('Error al conectar con Groq API, aplicando fallback local:', groqErr)
      }
    } else {
      // Regla de respaldo local si no hay GROQ_API_KEY en variables de entorno
      if (lead.title && /CEO|Founder|Director|Head|VP|Manager|Owner/i.test(lead.title)) {
        score += 30
      }
      if (customData.aboutPerson || customData.aboutCompany) {
        score += 20
      }
      icpReason = 'Calificado por reglas de perfil (Configura GROQ_API_KEY para habilitar IA).'
    }

    // Determinar el estado en función de la puntuación
    const status = score >= 70 ? 'qualified' : 'disqualified'

    // Actualizar el registro del lead en la base de datos
    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: {
        icpScore: score,
        icpReason,
        status,
      },
    })

    return NextResponse.json(updatedLead)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error al calificar el lead' },
      { status: 500 }
    )
  }
}