import { z } from "zod";
import { t } from "../context";
import { exampleRouter } from "./example";

export const appRouter = t.router({
  example: exampleRouter,
  greeting: t.procedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return `hello tRPC v10, ${input.name ?? "world"}!`;
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
