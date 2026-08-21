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

    // 1. Caso en el que el frontend envía { key: "...", value: "..." }
    if (body.key && body.value !== undefined) {
      await setSetting(body.key, body.value)
      return NextResponse.json({ ok: true })
    }

    // 2. Caso en el que el frontend envía { provider: "groq", apiKey: "gsk_...", model: "openai/gpt-oss-120b" }
    const entries = Object.entries(body)
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
    }

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        // Mapea las claves de la UI hacia los nombres en la base de datos
        let dbKey = key
        if (key === 'apiKey') dbKey = 'ai_api_key'
        if (key === 'provider') dbKey = 'ai_provider'
        if (key === 'model') dbKey = 'ai_model'

        await setSetting(dbKey, String(value))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}