import { z } from "zod";
import { t } from './context'

console.log("trpc file api");

export const appRouter = t.router({
  greeting: t.procedure
    .input(z.object({ name: z.string() }))
    .query(
      ({ input, ctx }) =>
        `hello tRPC v10, ${input.name ?? "world"}! I say ${ctx.tomato}`
    ),
});

// Export only the **type** of a router to avoid importing server code on the client
export type AppRouter = typeof appRouter;
