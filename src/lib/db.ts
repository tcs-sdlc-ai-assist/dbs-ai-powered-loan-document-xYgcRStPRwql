import { PrismaClient } from "@prisma/client";
import { MockDbClient } from "./mock-db-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (new MockDbClient() as unknown as PrismaClient);

globalForPrisma.prisma = prisma;

/**
 * Returns the MockDbClient instance if we're running with the mock DB,
 * so route handlers can call getPendingCookiePayload() to explicitly set
 * the state cookie on the NextResponse (guaranteed to work on Vercel).
 */
export function getMockDb(): MockDbClient | null {
  const db = globalForPrisma.prisma;
  if (db instanceof MockDbClient) return db;
  return null;
}

export default prisma;