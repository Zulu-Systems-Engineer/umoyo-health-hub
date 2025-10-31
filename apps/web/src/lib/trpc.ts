import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../functions/src/index";

export const trpc = createTRPCReact<AppRouter>();

