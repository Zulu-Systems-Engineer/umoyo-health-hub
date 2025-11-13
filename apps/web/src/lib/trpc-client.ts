import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../functions/src/appRouter';

export const trpc = createTRPCReact<AppRouter>();

const PROJECT_ID = 'umoyo-health-hub';
const REGION = 'us-central1';

/**
 * Get the backend URL based on environment
 */
export function getBaseUrl(): string {
  // 1. Check if explicitly set via env var (highest priority)
  if (import.meta.env.VITE_TRPC_URL) {
    const url = import.meta.env.VITE_TRPC_URL;
    console.log('🔧 Using VITE_TRPC_URL from env:', url);
    return url;
  }

  // 2. Development (Firebase emulators)
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/api/trpc`;
  }

  // 3. Production (Cloud Functions)
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/api/trpc`;
}

// Backwards compatibility for existing imports
export const getBackendUrl = getBaseUrl;

/**
 * Create the tRPC client
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getBaseUrl(),
      fetch(url, options) {
        // Helpful debugging for persistent 404s / path issues
        console.debug('🔗 tRPC request →', url);
        return fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          },
        });
      },
    }),
  ],
});