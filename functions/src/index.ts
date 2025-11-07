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

// TEMPORARY TEST: Allow everything from anywhere
expressApp.use(cors());

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

/**
 * Firebase Cloud Functions Entry Point
 * Sets up tRPC HTTP endpoint using Firebase Functions v1
 */

import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import cors from 'cors';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './context';

// Initialize Firebase Admin
initializeApp();

// Create Express app
const app = express();

// Configure CORS
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://umoyo-health-hub.web.app',
      'https://umoyo-health-hub.firebaseapp.com',
    ];

    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow any localhost/127.0.0.1 origin
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      console.log(`[CORS] Allowing development origin: ${origin}`);
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
};

// Apply CORS globally
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Export Cloud Function
export const api = functions
  .region('us-central1')
  .https
  .onRequest(app);

// Export router types for frontend
export type { AppRouter } from './router';
