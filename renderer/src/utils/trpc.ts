import type { AppRouter } from "../../../api/router/index";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();
