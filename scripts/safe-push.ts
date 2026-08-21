/**
 * Safe Prisma DB Push with auto-backup
 * Usage: npx tsx scripts/safe-push.ts
 *
 * This script:
 * 1. Creates a backup of all data
 * 2. Runs prisma db push
 * 3. If push fails, offers to restore from backup
 */

import { execSync } from 'child_process'
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
  console.log('🛡️  SenderX Safe Push — Auto-backup before schema push\n')

  // Step 1: Create backup
  console.log('📦 Step 1: Creating backup...')
  ensureBackupDir()
  const backupFile = path.join(BACKUP_DIR, `pre-push-${getTimestamp()}.json`)

  try {
    // Use Prisma to export data
    const { PrismaClient } = require('@prisma/client')
    const db = new PrismaClient()

    const [settings, senders, campaigns, campaignSenders, leads, emails, replies] = await Promise.all([
      db.setting.findMany().catch(() => []),
      db.sender.findMany().catch(() => []),
      db.campaign.findMany().catch(() => []),
      db.campaignSender.findMany().catch(() => []),
      db.lead.findMany().catch(() => []),
      db.email.findMany().catch(() => []),
      db.reply.findMany().catch(() => []),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      tables: { settings, senders, campaigns, campaignSenders, leads, emails, replies },
    }

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`   ✅ Backup saved: ${backupFile}`)
    console.log(`   📊 Records: ${settings.length} settings, ${senders.length} senders, ${campaigns.length} campaigns, ${leads.length} leads, ${emails.length} emails, ${replies.length} replies\n`)

    await db.$disconnect()
  } catch (error) {
    console.log(`   ⚠️  Backup failed (database may not exist yet): ${error}`)
    console.log(`   Continuing with push anyway...\n`)
  }

  // Step 2: Run prisma db push
  console.log('🚀 Step 2: Running prisma db push...')
  try {
    const output = execSync('npx prisma db push --accept-data-loss', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 120000,
    })
    console.log(output)
    console.log('✅ Push completed successfully!')
  } catch (error: any) {
    console.error('❌ Push failed!')
    console.error(error.stdout || error.message)

    if (fs.existsSync(backupFile)) {
      console.log(`\n💡 To restore from backup, run:`)
      console.log(`   npx tsx scripts/restore-data.ts ${backupFile}`)
    }
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
