export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId, senderId } = body

    if (!leadId || !senderId) {
      return NextResponse.json({ error: 'leadId and senderId required' }, { status: 400 })
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const sender = await db.sender.findUnique({
      where: { id: senderId },
    })

    const senderName = sender?.name || lead.campaign?.senderName || 'El equipo'
    const groqApiKey = process.env.GROQ_API_KEY

    let generated = {
      subject: `Oportunidad de colaboración con ${lead.company || 'tu empresa'}`,
      greeting: `Hola ${lead.firstName || ''},`,
      body: `Me pongo en contacto contigo para explorar formas de aportar valor a ${lead.company || 'tu empresa'}.`,
      cta: `¿Tendrías 10 minutos esta semana para conversarlo?`,
      signature: `Saludos,\n${senderName}`,
    }

    if (groqApiKey) {
      try {
        const campaignPrompt =
          lead.campaign?.sequencePrompt ||
          lead.campaign?.promptContext ||
          'Genera un correo de prospección B2B breve y personalizado.'

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
                content: `Eres un experto en Copywriting B2B Outbound. Instrucciones: "${campaignPrompt}". Firma como "${senderName}". Responde ÚNICAMENTE con un JSON válido con las claves: "subject", "greeting", "body", "cta", "signature".`,
              },
              {
                role: 'user',
                content: `Lead Info:
Nombre: ${lead.firstName || ''} ${lead.lastName || ''}
Cargo: ${lead.title || 'N/A'}
Empresa: ${lead.company || 'N/A'}
Sitio Web: ${lead.website || 'N/A'}
ICP: ${lead.campaign?.icp || 'N/A'}`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        })

        if (response.ok) {
          const aiData = await response.json()
          const parsed = JSON.parse(aiData.choices[0].message.content)
          generated = {
            subject: parsed.subject || generated.subject,
            greeting: parsed.greeting || generated.greeting,
            body: parsed.body || generated.body,
            cta: parsed.cta || generated.cta,
            signature: parsed.signature || generated.signature,
          }
        }
      } catch (groqErr) {
        console.warn('Error con Groq API, aplicando fallback local:', groqErr)
      }
    }

    const fullBody = `${generated.greeting}\n\n${generated.body}\n\n${generated.cta}`
    const plainText = `${fullBody}\n\n${generated.signature}`
    const htmlContent = `<div>${generated.greeting}</div><br/><div>${generated.body}</div><br/><div>${generated.cta}</div><br/><div>${generated.signature}</div>`

    const emailRecord = await db.email.create({
      data: {
        leadId: lead.id,
        senderId,
        subject: generated.subject,
        greeting: generated.greeting,
        body: generated.body,
        cta: generated.cta,
        signature: generated.signature,
        plainText,
        htmlContent,
        status: 'draft',
        sequenceRole: 'initial',
        sequenceStep: 0,
      },
    })

    return NextResponse.json(emailRecord, { status: 201 })
  } catch (error) {
    console.error('Error al generar correo:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}