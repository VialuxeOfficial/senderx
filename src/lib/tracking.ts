import { db } from './db'

/**
 * Generate tracking pixel HTML (1x1 transparent GIF)
 */
export function getTrackingPixelHtml(emailId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const pixelUrl = `${baseUrl}/api/track/open?id=${emailId}`
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`
}

/**
 * Wrap a URL with click tracking
 */
export function wrapClickUrl(url: string, emailId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  return `${baseUrl}/api/track/click?id=${emailId}&url=${encodeURIComponent(url)}`
}

/**
 * Record an open event
 */
export async function recordOpen(emailId: string): Promise<void> {
  try {
    await db.email.update({
      where: { id: emailId },
      data: { openedAt: new Date() },
    })
  } catch {
    // Email may have been deleted
  }
}

/**
 * Record a click event
 */
export async function recordClick(emailId: string): Promise<void> {
  try {
    await db.email.update({
      where: { id: emailId },
      data: { clickedAt: new Date() },
    })
  } catch {
    // Email may have been deleted
  }
}

/**
 * Generate unsubscribe URL
 */
export function getUnsubscribeUrl(leadEmail: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  return `${baseUrl}/api/track/unsubscribe?email=${encodeURIComponent(leadEmail)}`
}

/**
 * Add tracking to HTML email content
 */
export function addTrackingToHtml(html: string, emailId: string, leadEmail: string): string {
  // Add tracking pixel before </body>
  const pixel = getTrackingPixelHtml(emailId)
  let trackedHtml = html.replace('</body>', `${pixel}</body>`)

  // If no </body> tag, append pixel
  if (!html.includes('</body>')) {
    trackedHtml = html + pixel
  }

  // Add unsubscribe footer
  const unsubUrl = getUnsubscribeUrl(leadEmail)
  const unsubFooter = `<div style="margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#999;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></div>`

  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${unsubFooter}</body>`)
  } else {
    trackedHtml += unsubFooter
  }

  return trackedHtml
}
