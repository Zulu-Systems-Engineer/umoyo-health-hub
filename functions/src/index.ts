/**
 * Firebase Cloud Functions Entry Point
 * Sets up tRPC HTTP endpoint using Firebase Functions v2
 */

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { app, createContext } from './app';
import { config } from './config';

// Initialize Firebase Admin
initializeApp({
  projectId: config.firebase.projectId,
});

// Create Express app
const expressApp = express();

// Add tRPC middleware
expressApp.use(
  '/trpc',
  createExpressMiddleware({
    router: app,
    createContext: async ({ req, res }) => createContext({ req, res }),
    onError: ({ error, path }) => {
      console.error(`[tRPC Error] ${path}:`, error);
    },
  })
);

// Health check endpoint
expressApp.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * tRPC HTTP endpoint handler
 */
export const trpc = onRequest(
  {
    region: config.gcp.region,
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  expressApp
);

// Export app and router types for frontend
export { app };
export type { AppRouter } from './app';
