import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/settings'
import { autoBackup } from '@/lib/auto-backup'

export const dynamic = 'force-dynamic'

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

    // Respaldo silencioso (no interrumpe el guardado si falla)
    try {
      await autoBackup('pre-settings-change')
    } catch (e) {
      console.warn('Auto backup skipped:', e)
    }

    // Procesa variables aiProvider, aiApiKey, aiModel
    if (body.aiProvider !== undefined || body.aiApiKey !== undefined || body.aiModel !== undefined) {
      if (body.aiProvider) await setSetting('ai_provider', String(body.aiProvider))
      if (body.aiApiKey) await setSetting('ai_api_key', String(body.aiApiKey))
      if (body.aiModel) await setSetting('ai_model', String(body.aiModel))
      return NextResponse.json({ ok: true })
    }

    // Procesa formato key / value individual
    if (body.key && body.value !== undefined) {
      await setSetting(body.key, String(body.value))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}