import { NextRequest, NextResponse } from 'next/server'
import { recordOpen } from '@/lib/tracking'

// 1x1 transparent GIF (43 bytes)
const PIXEL_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      // Record open asynchronously (don't await to avoid delay)
      recordOpen(id).catch(() => {})
    }

    return new NextResponse(PIXEL_BUFFER, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': '43',
      },
    })
  } catch {
    return new NextResponse(PIXEL_BUFFER, {
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}
