export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autoBackup } from '@/lib/auto-backup'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { campaignId, leads }: { campaignId: string; leads: any[] } = body

    if (!campaignId || !leads?.length) {
      return NextResponse.json(
        { error: 'campaignId y la lista de leads son requeridos' },
        { status: 400 }
      )
    }

    // Auto-backup protegido para entornos serverless (evita crashes si el FS es read-only)
    try {
      if (typeof autoBackup === 'function') {
        await autoBackup('post-import')
      }
    } catch (backupErr) {
      console.warn('Auto-backup omitido:', backupErr)
    }

    let imported = 0
    let duplicates = 0
    const errors: string[] = []

    for (const lead of leads) {
      // Detección flexible de email (soporta minúsculas, Mayúsculas y encabezados de Apollo)
      const rawEmail =
        lead.email ||
        lead.Email ||
        lead['Email Address'] ||
        lead['email address']

      if (!rawEmail) {
        errors.push(
          `Missing email for lead: ${
            lead.name || lead.firstName || lead['First Name'] || 'unknown'
          }`
        )
        continue
      }

      const email = String(rawEmail).toLowerCase().trim()
      const emailHash = createHash('sha256').update(email).digest('hex')

      const company = lead.company || lead.Company || lead['Company Name'] || null

      // Detección de duplicados multicapa consolidada
      const existingLead = await db.lead.findFirst({
        where: {
          OR: [
            { email },
            { emailHash },
            ...(company ? [{ email, company }] : []),
          ],
        },
      })

      if (existingLead) {
        duplicates++
        continue
      }

      // Procesamiento de nombres (soporta name completo o firstName/lastName de Apollo)
      let firstName = lead.firstName || lead['First Name'] || lead.first_name || null
      let lastName = lead.lastName || lead['Last Name'] || lead.last_name || null

      if (!firstName && (lead.name || lead.Name || lead['Full Name'])) {
        const fullName = lead.name || lead.Name || lead['Full Name']
        const nameParts = String(fullName).trim().split(' ')
        firstName = nameParts[0] || null
        lastName = nameParts.slice(1).join(' ') || null
      }

      // Asignación de variante A/B
      const variantGroup = lead.variantGroup || (imported % 2 === 0 ? 'A' : 'B')

      // Mapeo completo de customData priorizando la biografía para la personalización de IA
      const customDataObj = {
        ...(lead.customData ? lead.customData : {}),
        aboutPerson: lead['About (Person)'] || lead.aboutPerson || lead.about || undefined,
        aboutCompany: lead['About (Company)'] || lead.aboutCompany || undefined,
        companySize: lead['Company Size'] || lead.companySize || undefined,
        industry: lead.Industry || lead.industry || undefined,
        location: lead.Location || lead.location || undefined,
      }

      try {
        await db.lead.create({
          data: {
            campaignId,
            email,
            firstName,
            lastName,
            company,
            title: lead.title || lead.Title || lead['Job Title'] || null,
            website: lead.website || lead.Website || lead['Company Website'] || null,
            phone: lead.phone || lead.Phone || lead['Phone Number'] || null,
            linkedin:
              lead.linkedin ||
              lead.LinkedIn ||
              lead['Person Linkedin Url'] ||
              lead['LinkedIn URL'] ||
              null,
            customData: JSON.stringify(customDataObj),
            emailHash,
            variantGroup,
          },
        })
        imported++
      } catch (err: any) {
        errors.push(`Error al importar ${email}: ${err?.message || String(err)}`)
      }
    }

    return NextResponse.json({
      imported,
      duplicates,
      errors: errors.length ? errors : undefined,
    })
  } catch (error: any) {
    // Retorna el mensaje exacto para evitar el error genérico en DevTools
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    )
  }
}