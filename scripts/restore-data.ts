/**
 * Restore data from a backup JSON file
 * Usage: npx tsx scripts/restore-data.ts [filepath]
 *
 * If no filepath given, uses the most recent backup in /db/backups/
 */

import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')

async function main() {
  const inputPath = process.argv[2]

  let filepath = inputPath

  if (!filepath) {
    // Find most recent backup
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error('❌ No backups directory found')
      process.exit(1)
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()

    if (files.length === 0) {
      console.error('❌ No backup files found')
      process.exit(1)
    }

    filepath = path.join(BACKUP_DIR, files[0])
    console.log(`📦 Using most recent backup: ${files[0]}\n`)
  }

  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`)
    process.exit(1)
  }

  console.log('⚠️  WARNING: This will DELETE all existing data and replace with backup!')
  console.log(`📄 Restoring from: ${filepath}\n`)

  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  const { tables } = data

  if (!tables) {
    console.error('❌ Invalid backup file: missing "tables" key')
    process.exit(1)
  }

  // Create a pre-restore backup
  const preRestoreFile = path.join(BACKUP_DIR, `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`)
  console.log('📦 Creating pre-restore backup...')

  const { PrismaClient } = require('@prisma/client')
  const db = new PrismaClient()

  try {
    // Save current state as pre-restore backup
    const [settings, senders, campaigns, campaignSenders, leads, emails, replies] = await Promise.all([
      db.setting.findMany(),
      db.sender.findMany(),
      db.campaign.findMany(),
      db.campaignSender.findMany(),
      db.lead.findMany(),
      db.email.findMany(),
      db.reply.findMany(),
    ])

    const preRestoreData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      tables: { settings, senders, campaigns, campaignSenders, leads, emails, replies },
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
    fs.writeFileSync(preRestoreFile, JSON.stringify(preRestoreData, null, 2), 'utf-8')
    console.log(`   ✅ Pre-restore backup saved: ${preRestoreFile}\n`)

    // Clear existing data (dependency order)
    console.log('🗑️  Clearing existing data...')
    await db.$transaction([
      db.reply.deleteMany(),
      db.email.deleteMany(),
      db.lead.deleteMany(),
      db.campaignSender.deleteMany(),
      db.campaign.deleteMany(),
      db.sender.deleteMany(),
      db.setting.deleteMany(),
    ])
    console.log('   ✅ Data cleared\n')

    // Import data (dependency order)
    console.log('📥 Importing data...')
    if (tables.settings?.length) {
      await db.setting.createMany({ data: tables.settings, skipDuplicates: true })
      console.log(`   Settings: ${tables.settings.length}`)
    }
    if (tables.senders?.length) {
      await db.sender.createMany({ data: tables.senders, skipDuplicates: true })
      console.log(`   Senders: ${tables.senders.length}`)
    }
    if (tables.campaigns?.length) {
      await db.campaign.createMany({ data: tables.campaigns, skipDuplicates: true })
      console.log(`   Campaigns: ${tables.campaigns.length}`)
    }
    if (tables.campaignSenders?.length) {
      await db.campaignSender.createMany({ data: tables.campaignSenders, skipDuplicates: true })
      console.log(`   CampaignSenders: ${tables.campaignSenders.length}`)
    }
    if (tables.leads?.length) {
      await db.lead.createMany({ data: tables.leads, skipDuplicates: true })
      console.log(`   Leads: ${tables.leads.length}`)
    }
    if (tables.emails?.length) {
      await db.email.createMany({ data: tables.emails, skipDuplicates: true })
      console.log(`   Emails: ${tables.emails.length}`)
    }
    if (tables.replies?.length) {
      await db.reply.createMany({ data: tables.replies, skipDuplicates: true })
      console.log(`   Replies: ${tables.replies.length}`)
    }

    console.log('\n✅ Restore completed successfully!')
  } catch (error) {
    console.error('❌ Restore failed:', error)
    console.log(`\n💡 Pre-restore backup is available at: ${preRestoreFile}`)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
