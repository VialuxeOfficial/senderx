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
    const { key, value }: { key: string; value: string } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 })
    }

    await autoBackup('pre-settings-change')
    await setSetting(key, value)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
