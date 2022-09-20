import { z } from "zod";
import { t } from "../context";

export const appRouter = t.router({
  greeting: t.procedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input, ctx }) => {
      const count = await ctx.prisma.example.count();
      return `hello tRPC v10, ${input.name ?? "world"}! I say ${
        ctx.tomato
      }. Example count: ${count}`;
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
