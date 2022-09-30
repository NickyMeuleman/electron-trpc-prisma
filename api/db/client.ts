import { PrismaClient } from "@prisma/client";
import path from "path";
// need to import something from "electron" to add electron-specific types to `process`
import type {} from "electron";
// https://www.electronjs.org/docs/latest/api/process
// importing dbPath from main errors with "cannot access dbPath before initialization" is that temporal-dead-zone?
// importing dbPath from preload errors with "cannot read undefined on exposeInMainWorld"
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
// add prisma to the global type
type GlobalThis = typeof globalThis;
interface CustomGlobalThis extends GlobalThis {
  prisma?: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
// must use var, not let or const: https://stackoverflow.com/questions/35074713/extending-typescript-global-object-in-node-js/68328575#68328575
// eslint-disable-next-line no-var
declare var global: CustomGlobalThis;

const dbPath =
  process.env.NODE_ENV === "development"
    ? path.join(__dirname, "../../buildResources/db.sqlite")
    : path.join(process.resourcesPath, "buildResources/db.sqlite");

export const prisma =
  global.prisma ??
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
