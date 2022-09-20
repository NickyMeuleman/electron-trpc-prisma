import { createTRPCReact } from "@trpc/react";
import type { AppRouter } from "../../../api/trpc";
console.log("trpc util renderer");

export const trpc = createTRPCReact<AppRouter>();
