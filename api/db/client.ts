import { PrismaClient } from "@prisma/client";

// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
// add prisma to the global type
type GlobalThis = typeof globalThis;
interface CustomGlobalThis extends GlobalThis {
  prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare var global: CustomGlobalThis;

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "info"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
