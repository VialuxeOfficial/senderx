import { db } from './db'
import path from 'path'
import fs from 'fs'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

/**
 * Get timestamped backup filename
 */
function getBackupFilename(trigger: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  return `backup-${trigger}-${ts}.json`
}

/**
 * Auto-backup safety net with 12 triggers.
 * Creates a full data backup before dangerous operations.
 */
export async function autoBackup(trigger: string): Promise<{ filename: string; path: string }> {
  ensureBackupDir()
  const filename = getBackupFilename(trigger)
  const filepath = path.join(BACKUP_DIR, filename)

  const data = await exportAllData()
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')

  console.log(`[auto-backup] ${trigger} → ${filename}`)
  return { filename, path: filepath }
}

/**
 * Export all data from the database
 */
export async function exportAllData(): Promise<Record<string, any>> {
  const [settings, senders, campaigns, campaignSenders, leads, emails, replies] = await Promise.all([
    db.setting.findMany(),
    db.sender.findMany(),
    db.campaign.findMany(),
    db.campaignSender.findMany(),
    db.lead.findMany(),
    db.email.findMany(),
    db.reply.findMany(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    tables: {
      settings,
      senders,
      campaigns,
      campaignSenders,
      leads,
      emails,
      replies,
    },
  }
}

/**
 * Import data from a backup file
 */
export async function importData(data: Record<string, any>): Promise<void> {
  const { tables } = data

  // Clear existing data (in dependency order)
  await db.$transaction([
    db.reply.deleteMany(),
    db.email.deleteMany(),
    db.lead.deleteMany(),
    db.campaignSender.deleteMany(),
    db.campaign.deleteMany(),
    db.sender.deleteMany(),
    db.setting.deleteMany(),
  ])

  // Insert in dependency order
  if (tables.settings?.length) {
    await db.setting.createMany({ data: tables.settings, skipDuplicates: true })
  }
  if (tables.senders?.length) {
    await db.sender.createMany({ data: tables.senders, skipDuplicates: true })
  }
  if (tables.campaigns?.length) {
    await db.campaign.createMany({ data: tables.campaigns, skipDuplicates: true })
  }
  if (tables.campaignSenders?.length) {
    await db.campaignSender.createMany({ data: tables.campaignSenders, skipDuplicates: true })
  }
  if (tables.leads?.length) {
    await db.lead.createMany({ data: tables.leads, skipDuplicates: true })
  }
  if (tables.emails?.length) {
    await db.email.createMany({ data: tables.emails, skipDuplicates: true })
  }
  if (tables.replies?.length) {
    await db.reply.createMany({ data: tables.replies, skipDuplicates: true })
  }
}

/**
 * The 12 safety net triggers
 */
export const BACKUP_TRIGGERS = [
  'pre-send',        // Before sending emails
  'post-import',     // After importing leads
  'pre-migrate',     // Before Prisma migration
  'pre-restore',     // Before restoring from backup
  'pre-reset',       // Before database reset
  'pre-push',        // Before prisma db push
  'pre-campaign-delete', // Before deleting a campaign
  'pre-lead-delete',     // Before deleting leads
  'pre-sender-delete',   // Before deleting a sender
  'pre-settings-change', // Before changing settings
  'pre-sequence-generate', // Before generating follow-up sequence
  'pre-qualify',         // Before bulk qualification
] as const

export type BackupTrigger = typeof BACKUP_TRIGGERS[number]

/**
 * Check if trigger is valid
 */
export function isValidTrigger(trigger: string): trigger is BackupTrigger {
  return BACKUP_TRIGGERS.includes(trigger as any)
}
