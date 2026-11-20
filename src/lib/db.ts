import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, only log errors (not every query — too noisy).
// In production, log only errors and warnings.
const logConfig: ('error' | 'warn')[] =
  process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['error']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
