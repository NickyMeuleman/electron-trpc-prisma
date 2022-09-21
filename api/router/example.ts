import { t } from "../context";
import { randomUUID } from "crypto";
import { z } from "zod";

export const exampleRouter = t.router({
  getAll: t.procedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany();
  }),
  add: t.procedure.mutation(({ ctx }) => {
    return ctx.prisma.example.create({
      data: { id: randomUUID() },
    });
  }),
  remove: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.example.delete({
        where: { id: input.id },
      });
    }),
});
