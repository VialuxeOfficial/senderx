import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import { db } from './db'
import { getSetting } from './settings'

const THROTTLE_MS = 40_000 // 40 seconds between sends

let lastSendTime = 0

/**
 * Get SMTP transporter for a sender
 */
function getTransporter(sender: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
}) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  })
}

/**
 * Check if sender has reached daily limit (25/day, reset at midnight)
 */
async function checkDailyLimit(senderId: string, sender: { dailyLimit: number; sentToday: number; lastResetAt: Date }): Promise<boolean> {
  const now = new Date()
  const lastReset = new Date(sender.lastResetAt)
  const isSameDay = now.getFullYear() === lastReset.getFullYear() &&
    now.getMonth() === lastReset.getMonth() &&
    now.getDate() === lastReset.getDate()

  if (!isSameDay) {
    // Reset counter
    await db.sender.update({
      where: { id: senderId },
      data: { sentToday: 0, lastResetAt: now },
    })
    return true
  }

  return sender.sentToday < sender.dailyLimit
}

/**
 * Check if current time is within sending window
 */
async function isWithinSendingWindow(campaign: {
  sendingWindowStart: number
  sendingWindowEnd: number
  timezone: string
  skipWeekends: boolean
}): Promise<boolean> {
  const now = new Date()

  // Check weekend
  if (campaign.skipWeekends) {
    const day = now.getDay() // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false
  }

  // Check sending window
  const localHour = now.getHours() // Simplified: uses server timezone
  return localHour >= campaign.sendingWindowStart && localHour < campaign.sendingWindowEnd
}

/**
 * Apply 40-second throttle
 */
async function applyThrottle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastSendTime
  if (elapsed < THROTTLE_MS) {
    const waitMs = THROTTLE_MS - elapsed
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
  lastSendTime = Date.now()
}

/**
 * Append a sent email to the IMAP Sent folder
 */
async function appendToImapSent(
  sender: { imapHost: string; imapPort: number; imapUser: string; imapPass: string },
  message: string
): Promise<void> {
  const client = new ImapFlow({
    host: sender.imapHost,
    port: sender.imapPort,
    secure: true,
    auth: {
      user: sender.imapUser,
      pass: sender.imapPass,
    },
    logger: false as any,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock('Sent')
    try {
      await client.append('Sent', message, new Date())
    } finally {
      lock.release()
    }
  } catch (error) {
    console.error('IMAP append to Sent failed:', error)
    // Non-fatal: email was still sent via SMTP
  } finally {
    try { await client.logout() } catch {}
  }
}

/**
 * Send an email via SMTP with all safety features
 */
export async function sendEmail(params: {
  senderId: string
  to: string
  subject: string
  plainText: string
  htmlContent: string
  inReplyTo?: string
  references?: string
  campaignId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Get sender
  const sender = await db.sender.findUnique({ where: { id: params.senderId } })
  if (!sender) return { success: false, error: 'Sender not found' }
  if (!sender.isActive) return { success: false, error: 'Sender is inactive' }

  // Check daily limit
  const withinLimit = await checkDailyLimit(params.senderId, sender)
  if (!withinLimit) return { success: false, error: 'Daily limit reached (25/day)' }

  // Check sending window if campaign specified
  if (params.campaignId) {
    const campaign = await db.campaign.findUnique({ where: { id: params.campaignId } })
    if (campaign) {
      const inWindow = await isWithinSendingWindow(campaign)
      if (!inWindow) return { success: false, error: 'Outside sending window' }
    }
  }

  // Apply 40s throttle
  await applyThrottle()

  // Build email headers
  const headers: Record<string, string> = {}
  if (params.inReplyTo) headers['In-Reply-To'] = params.inReplyTo
  if (params.references) headers['References'] = params.references

  // Add List-Unsubscribe header
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  if (baseUrl) {
    headers['List-Unsubscribe'] = `<${baseUrl}/api/track/unsubscribe?email=${encodeURIComponent(params.to)}>`
  }

  try {
    const transporter = getTransporter(sender)
    const result = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: params.to,
      subject: params.subject,
      text: params.plainText,
      html: params.htmlContent,
      headers,
    })

    // Increment sentToday counter
    await db.sender.update({
      where: { id: params.senderId },
      data: { sentToday: { increment: 1 } },
    })

    // Append to IMAP Sent folder (non-blocking)
    const rawMessage = `From: "${sender.name}" <${sender.email}>\r\nTo: ${params.to}\r\nSubject: ${params.subject}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${params.plainText}`
    appendToImapSent(sender, rawMessage).catch(err =>
      console.error('Background IMAP append failed:', err)
    )

    return { success: true, messageId: result.messageId }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'SMTP error' }
  }
}

/**
 * Test SMTP connection for a sender
 */
export async function testSmtpConnection(sender: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = getTransporter(sender)
    await transporter.verify()
    await transporter.close()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

/**
 * Test IMAP connection for a sender
 */
export async function testImapConnection(sender: {
  imapHost: string
  imapPort: number
  imapUser: string
  imapPass: string
}): Promise<{ ok: boolean; error?: string }> {
  const client = new ImapFlow({
    host: sender.imapHost,
    port: sender.imapPort,
    secure: true,
    auth: {
      user: sender.imapUser,
      pass: sender.imapPass,
    },
    logger: false as any,
  })

  try {
    await client.connect()
    await client.logout()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

export { applyThrottle, checkDailyLimit, isWithinSendingWindow, appendToImapSent }
