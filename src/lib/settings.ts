import { db } from './db'

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.setting.findUnique({ where: { key } })
  return setting?.value ?? null
}

/**
 * Set a setting value by key (upsert)
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

/**
 * Get all settings as a key-value map
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await db.setting.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) {
    map[s.key] = s.value
  }
  return map
}
