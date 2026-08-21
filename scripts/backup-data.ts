/**
 * Backup all data to JSON file
 * Usage: npx tsx scripts/backup-data.ts
 *
 * Creates a full backup in /db/backups/ using process.cwd()
 */

import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
}

async function main() {
  console.log('📦 SenderX Data Backup\n')

  ensureBackupDir()

  const { PrismaClient } = require('@prisma/client')
  const db = new PrismaClient()

  try {
    const [settings, senders, campaigns, campaignSenders, leads, emails, replies] = await Promise.all([
      db.setting.findMany(),
      db.sender.findMany(),
      db.campaign.findMany(),
      db.campaignSender.findMany(),
      db.lead.findMany(),
      db.email.findMany(),
      db.reply.findMany(),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      tables: { settings, senders, campaigns, campaignSenders, leads, emails, replies },
    }

    const filename = `backup-${getTimestamp()}.json`
    const filepath = path.join(BACKUP_DIR, filename)

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')

    console.log('✅ Backup completed successfully!')
    console.log(`📄 File: ${filepath}`)
    console.log(`📊 Records:`)
    console.log(`   Settings:        ${settings.length}`)
    console.log(`   Senders:         ${senders.length}`)
    console.log(`   Campaigns:       ${campaigns.length}`)
    console.log(`   CampaignSenders: ${campaignSenders.length}`)
    console.log(`   Leads:           ${leads.length}`)
    console.log(`   Emails:          ${emails.length}`)
    console.log(`   Replies:         ${replies.length}`)
    console.log(`   Total:           ${settings.length + senders.length + campaigns.length + campaignSenders.length + leads.length + emails.length + replies.length}`)
  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
