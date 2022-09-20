import type { AppRouter } from "../../../api/router/index";
import { createTRPCReact } from "@trpc/react";

export const trpc = createTRPCReact<AppRouter>();
