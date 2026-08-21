export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { autoBackup, importData } from '@/lib/auto-backup'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename }: { filename: string } = body

    if (!filename) {
      return NextResponse.json({ error: 'filename required' }, { status: 400 })
    }

    const filepath = path.join(BACKUP_DIR, filename)

    // Prevent directory traversal
    if (!filepath.startsWith(BACKUP_DIR)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    // Auto-backup before restore
    await autoBackup('pre-restore')

    // Read and import
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    await importData(data)

    return NextResponse.json({ ok: true, restoredFrom: filename })
  } catch (error) {
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
