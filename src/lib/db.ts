import { PrismaClient } from '@prisma/client'

/**
 * SenderX Database Client
 *
 * FIX: La plataforma Z.ai sobreescribe DATABASE_URL con un SQLite local,
 * pero SenderX requiere PostgreSQL (Supabase) para persistencia跨 deploy.
 *
 * Solución: Usar SUPABASE_DATABASE_URL para bypassear la inyección de Z.ai.
 * En runtime, PrismaClient usa esta URL directamente via datasources override.
 * En build time, prisma generate solo lee el schema (no conecta a la DB).
 */

const supabaseUrl = process.env.SUPABASE_DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    ...(supabaseUrl ? {
      datasources: {
        db: {
          url: supabaseUrl,
        },
      },
    } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
