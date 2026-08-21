export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params
    const filepath = path.join(BACKUP_DIR, filename)

    // Prevent directory traversal
    if (!filepath.startsWith(BACKUP_DIR)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const content = fs.readFileSync(filepath, 'utf-8')
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 })
  }
}
