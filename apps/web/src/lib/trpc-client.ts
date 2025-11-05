import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
// @ts-expect-error - AppRouter type will be available after functions are built
import type { AppRouter } from "../../../functions/src/index";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  // @ts-expect-error - Client will work at runtime
  return trpc.createClient({
    links: [
      httpBatchLink({
        // Firebase Functions emulator URL format: http://localhost:5001/{project-id}/{region}/{function-name}
        // For production, use the deployed function URL
        url: import.meta.env.VITE_TRPC_URL || "http://localhost:5001/umoyo-health-hub/us-central1/trpc",
      }),
    ],
  });
}

export const trpcClient = createTRPCClient();

