import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initializeServices } from './init';

// Lazy import router to catch any import-time errors
let appRouter: any;
let createContext: any;

try {
  const routerModule = require('./router');
  const contextModule = require('./context');
  appRouter = routerModule.appRouter;
  createContext = contextModule.createContext;
  console.log('Router and context loaded successfully');
} catch (error: any) {
  console.error('FATAL: Failed to load router or context:', error);
  console.error(error.stack);
  // Create minimal fallback
  appRouter = null;
  createContext = null;
}

// --- START LAZY INITIALIZATION FIX ---
let servicesInitialized = false;

const ensureInitialized = () => {
  if (!servicesInitialized) {
    try {
      console.log('--- Lazy Initializing Services (Cold Start) ---');
      initializeServices();
      servicesInitialized = true;
      console.log('--- Services Initialized Successfully ---');
    } catch (error: any) {
      console.error('--- Error Initializing Services ---', error);
      // Don't throw - allow function to start even if services fail
      // Services will be retried on first request
    }
  }
};
// --- END LAZY INITIALIZATION FIX ---

// Create Express app - wrap in try-catch for safety
let app: express.Application;
try {
  console.log('Creating Express app...');
  app = express();
} catch (error: any) {
  console.error('Error creating Express app:', error);
  throw error; // This is critical, so we should throw
}

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ✅ --- THE FIX ---
// This line parses incoming JSON request bodies.
// It MUST come before the tRPC middleware, otherwise req.body will be undefined.
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  ensureInitialized();
  res.status(200).json({
    status: 'ok',
    service: 'umoyo-health-hub-api',
    timestamp: new Date().toISOString(),
    initialized: servicesInitialized,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  ensureInitialized();
  res.status(200).json({
    message: 'Umoyo Health Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      trpc: '/trpc'
    }
  });
});

// tRPC middleware
// We call ensureInitialized before passing control to tRPC
app.use('/trpc', (req, res, next) => {
  ensureInitialized();
  
  // Check if router was loaded successfully
  if (!appRouter || !createContext) {
    res.status(500).json({
      error: 'Router not initialized',
      message: 'Failed to load router during module initialization',
    });
    return;
  }
  
  next();
}, createExpressMiddleware({
  router: appRouter,
  createContext,
}));

console.log('Express app configured (non-blocking)');

// Export the Firebase Function with explicit configuration
const httpsOptions: HttpsOptions = {
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 60,
  maxInstances: 10,
};

// Export the function
export const api = onRequest(httpsOptions, app);
