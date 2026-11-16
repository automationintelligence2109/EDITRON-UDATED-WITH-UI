import { PrismaClient, TranscriptionJobStatus } from "../../node_modules/.prisma/client-pg";

export { TranscriptionJobStatus };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db