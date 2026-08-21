import { NextResponse } from 'next/server'
import { autoBackup } from '@/lib/auto-backup'

export async function POST() {
  try {
    const result = await autoBackup('pre-settings-change')
    return NextResponse.json({ ok: true, filename: result.filename })
  } catch (error) {
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}
