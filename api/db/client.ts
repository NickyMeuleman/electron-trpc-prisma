import { PrismaClient } from "@prisma/client";
import path from "path";

// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
// add prisma to the global type
type GlobalThis = typeof globalThis;
interface CustomGlobalThis extends GlobalThis {
  prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare var global: CustomGlobalThis;

// https://www.electronjs.org/docs/latest/api/process
// specific electron things on process are typed in the main/preload process but not here,
//  they are also available here, but TypeScript doesn't know that
console.log("test", path.join(__dirname, "../../prisma/db.sqlite"));

const dbPath = path.join(__dirname, "../../prisma/db.sqlite");
// const dbPath =
//   process.env.NODE_ENV === "development"
//     ? path.join(__dirname, "../../prisma/db.sqlite")
//     : // @ts-ignore
//       path.join(process.resourcesPath, "/db.sqlite");
console.log(dbPath);

// TODO: investigate why NODE_ENV is not being set to 'production' during compile
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    log: ["query", "info"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
