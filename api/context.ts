import * as trpc from "@trpc/server";
import { prisma } from "./db/client";

// adding prisma to context causes error
// App threw an error during load
// Error: PrismaClient is unable to be run in the browser.
export const createContext = async (opts?: any) => {
  console.log("inside createcontext");

  return {
    tomato: "tomahto",
    // prisma,
  };
};

export type Context = trpc.inferAsyncReturnType<typeof createContext>;

export const t = trpc.initTRPC.context<Context>().create();
