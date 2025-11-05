/**
 * Firebase Cloud Functions Entry Point
 * Sets up tRPC HTTP endpoint using Firebase Functions v2
 */

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { app, createContext } from './app';
import { config } from './config';

// Initialize Firebase Admin
initializeApp({
  projectId: config.firebase.projectId,
});

// Create Express app
const expressApp = express();

// CORS configuration - explicit allowed origins
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://umoyo-health-hub.web.app',
    'https://umoyo-health-hub.firebaseapp.com',
  ],
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-trpc-source',
    'x-trpc-version',
    'x-trpc-procedure',
    'x-requested-with',
  ],
  exposedHeaders: ['x-trpc-version'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Enable CORS for all routes - MUST be first to handle preflight requests
expressApp.use(cors(corsOptions));

// Explicit OPTIONS handler as fallback (CORS middleware should handle this, but explicit is safer)
expressApp.options('*', cors(corsOptions));

// Add body parser middleware
expressApp.use(express.json());

// Add tRPC middleware
const trpcHandler = createExpressMiddleware({
  router: app,
  createContext: async ({ req, res }) => createContext({ req, res }),
  onError: ({ error, path }) => {
    console.error(`[tRPC Error] ${path}:`, error);
  },
});

// Use the tRPC handler as Express middleware
expressApp.use('/trpc', trpcHandler as any);

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
    cors: false, // We handle CORS manually in Express
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  expressApp
);

// Export app and router types for frontend
export { app };
export type { AppRouter } from './app';
