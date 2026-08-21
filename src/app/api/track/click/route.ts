import { NextRequest, NextResponse } from 'next/server'
import { recordClick } from '@/lib/tracking'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const url = searchParams.get('url')

    if (id) {
      // Record click asynchronously
      recordClick(id).catch(() => {})
    }

    if (url) {
      return NextResponse.redirect(url, 302)
    }

    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Click tracking failed' }, { status: 500 })
  }
}
