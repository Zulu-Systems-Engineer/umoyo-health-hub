import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
// @ts-expect-error - AppRouter type will be available after functions are built
import type { AppRouter } from '../../../functions/src/index';

export const trpc = createTRPCReact<AppRouter>();

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_TRPC_URL || 'http://localhost:5001/umoyo-health-hub/us-central1/api/trpc',
        
        // Important: Add headers
        headers: () => ({
          'Content-Type': 'application/json',
        }),
        
        // Important: Include credentials
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
            mode: 'cors',
          });
        },
      }),
    ],
  });
}

export const trpcClient = createClient();

