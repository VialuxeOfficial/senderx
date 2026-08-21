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
      return NextResponse.json({ error: 'campaignId and leads array required' }, { status: 400 })
    }

    // Auto-backup before import
    await autoBackup('post-import')

    let imported = 0
    let duplicates = 0
    const errors: string[] = []

    for (const lead of leads) {
      if (!lead.email) {
        errors.push(`Missing email for lead: ${lead.firstName || 'unknown'}`)
        continue
      }

      const email = lead.email.toLowerCase().trim()
      const emailHash = createHash('sha256').update(email).digest('hex')

      // Cross-campaign duplicate detection (3 layers)
      // Layer 1: exact email match
      const existingByEmail = await db.lead.findFirst({ where: { email } })
      if (existingByEmail) {
        duplicates++
        continue
      }

      // Layer 2: email+company match
      if (lead.company) {
        const existingByCompany = await db.lead.findFirst({
          where: { email, company: lead.company },
        })
        if (existingByCompany) {
          duplicates++
          continue
        }
      }

      // Layer 3: email hash match
      const existingByHash = await db.lead.findFirst({ where: { emailHash } })
      if (existingByHash) {
        duplicates++
        continue
      }

      // A/B variant assignment
      const variantGroup = lead.variantGroup || (imported % 2 === 0 ? 'A' : 'B')

      try {
        await db.lead.create({
          data: {
            campaignId,
            email,
            firstName: lead.firstName || null,
            lastName: lead.lastName || null,
            company: lead.company || null,
            title: lead.title || null,
            website: lead.website || null,
            phone: lead.phone || null,
            linkedin: lead.linkedin || null,
            customData: lead.customData ? JSON.stringify(lead.customData) : null,
            emailHash,
            variantGroup,
          },
        })
        imported++
      } catch (err) {
        errors.push(`Failed to import ${email}: ${err}`)
      }
    }

    return NextResponse.json({ imported, duplicates, errors: errors.length ? errors : undefined })
  } catch (error) {
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
