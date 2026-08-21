import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { db } from './db'

/**
 * Sync inbox: fetch new emails via IMAP, parse replies, detect bounces, match to leads
 */
export async function syncInbox(sender: {
  id: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPass: string
  email: string
}): Promise<{ repliesFound: number; bouncesFound: number }> {
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

  let repliesFound = 0
  let bouncesFound = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Search for unseen messages
      const generator = client.fetch({ seen: false }, {
        source: true,
        envelope: true,
        flags: true,
      })

      for await (const message of generator) {
        try {
          // Parse the raw email
          const parsed = await simpleParser(message.source)

          const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || ''
          const subject = parsed.subject || ''
          const body = parsed.text || ''
          const messageId = parsed.messageId || ''
          const inReplyTo = parsed.inReplyTo || ''

          // Detect bounce
          const isBounce = detectBounce(fromEmail, subject, body)

          // Try to match to a lead by In-Reply-To or by from email
          const lead = await matchToLead(fromEmail, inReplyTo, messageId)

          if (lead) {
            // Save reply
            await db.reply.create({
              data: {
                leadId: lead.id,
                fromEmail,
                subject,
                body: body.substring(0, 10000), // Truncate long replies
                isBounce,
                messageId,
                inReplyTo,
              },
            })

            // Update lead status
            if (isBounce) {
              bouncesFound++
              await db.lead.update({
                where: { id: lead.id },
                data: { bounced: true, status: 'bounced' },
              })
            } else {
              repliesFound++
              await db.lead.update({
                where: { id: lead.id },
                data: { replied: true, status: 'replied' },
              })
            }
          }

          // Mark as seen
          await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen'])
        } catch (parseError) {
          console.error('Failed to parse message:', parseError)
        }
      }
    } finally {
      lock.release()
    }
  } catch (error) {
    console.error('IMAP sync error:', error)
  } finally {
    try { await client.logout() } catch {}
  }

  return { repliesFound, bouncesFound }
}

/**
 * Detect if an email is a bounce
 */
function detectBounce(fromEmail: string, subject: string, body: string): boolean {
  const bounceIndicators = [
    'mailer-daemon',
    'postmaster',
    'bounce',
    'undelivered',
    'failed delivery',
    'returned mail',
    'delivery failure',
    'non-delivery',
    'mail delivery subsystem',
  ]

  const fromLower = fromEmail.toLowerCase()
  const subjectLower = subject.toLowerCase()
  const bodyLower = body.substring(0, 2000).toLowerCase()

  // Check from email
  if (bounceIndicators.some(ind => fromLower.includes(ind))) return true

  // Check subject
  if (subjectLower.includes('undeliverable') || subjectLower.includes('bounced') || subjectLower.includes('failure notice')) return true

  // Check body for common bounce patterns
  if (bodyLower.includes('this is an automatically generated delivery status notification') ||
      bodyLower.includes('delivery to the following recipient failed') ||
      bodyLower.includes('the following addresses had permanent fatal errors')) {
    return true
  }

  return false
}

/**
 * Match a reply to a lead by In-Reply-To header or by from email
 */
async function matchToLead(fromEmail: string, inReplyTo: string, messageId: string): Promise<{ id: string } | null> {
  // Try to match by In-Reply-To (most reliable)
  if (inReplyTo) {
    const emailByReply = await db.email.findFirst({
      where: { inReplyTo: inReplyTo },
      include: { lead: true },
    })
    if (emailByReply?.lead) return { id: emailByReply.lead.id }

    // Also check the messageId field
    const emailByMsgId = await db.email.findFirst({
      where: { inReplyTo: messageId },
      include: { lead: true },
    })
    if (emailByMsgId?.lead) return { id: emailByMsgId.lead.id }
  }

  // Fallback: match by from email
  const lead = await db.lead.findFirst({
    where: { email: fromEmail },
  })
  return lead ? { id: lead.id } : null
}

export { detectBounce, matchToLead }
