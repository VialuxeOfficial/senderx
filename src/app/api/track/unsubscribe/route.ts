import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    // Mark all leads with this email as unsubscribed
    const result = await db.lead.updateMany({
      where: { email },
      data: { status: 'unsubscribed' },
    })

    // Return a simple HTML page
    const html = `<!DOCTYPE html>
<html><head><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;">
<h2>You have been unsubscribed</h2>
<p>Your email ${email} has been removed from all mailing lists.</p>
</body></html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }
}
