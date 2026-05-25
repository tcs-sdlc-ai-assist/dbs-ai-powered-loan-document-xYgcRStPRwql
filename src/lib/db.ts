import { PrismaClient } from "@prisma/client";
import { MockDbClient } from "./mock-db-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (new MockDbClient() as unknown as PrismaClient);

globalForPrisma.prisma = prisma;

export default prisma;