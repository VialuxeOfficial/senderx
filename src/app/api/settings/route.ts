import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/settings'
import { autoBackup } from '@/lib/auto-backup'

export async function GET() {
  try {
    const settings = await getAllSettings()
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await autoBackup('pre-settings-change')

    // Si viene un objeto con key y value individual
    if (body.key && body.value !== undefined) {
      await setSetting(body.key, body.value)
      return NextResponse.json({ ok: true })
    }

    // Si viene un objeto con múltiples configuraciones (provider, apiKey, model, etc.)
    const entries = Object.entries(body)
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
    }

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        // Mapea nombres de campos camelCase a los nombres de la BD
        const dbKey = key === 'apiKey' ? 'ai_api_key' : key === 'provider' ? 'ai_provider' : key === 'model' ? 'ai_model' : key
        await setSetting(dbKey, String(value))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}