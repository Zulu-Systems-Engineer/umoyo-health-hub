import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initializeServices } from './init';
import { appRouter } from './router';
import { createContext } from './context';

// --- START LAZY INITIALIZATION FIX ---

// Flag to track if services have been initialized for this function instance
let servicesInitialized = false;

/**
 * Ensures that Firebase Admin and other external services are initialized.
 * This function will only run once per cold-start to prevent deployment timeouts.
 */
const ensureInitialized = () => {
  if (!servicesInitialized) {
    console.log('--- Lazy Initializing Services (Cold Start) ---');
    // Calling the slow initialization logic now, but only on first request.
    initializeServices();
    servicesInitialized = true;
    console.log('--- Services Initialized Successfully ---');
  }
};

// --- END LAZY INITIALIZATION FIX ---

// Create Express app at module load time (This is fast and non-blocking)
console.log('Creating Express app...');
const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

// Health check endpoint
app.get('/health', (req, res) => {
  // We call initialization here to ensure services are ready, even for health checks
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
  next();
}, createExpressMiddleware({
  router: appRouter,
  createContext,
}));

console.log('Express app configured (non-blocking)');

// Export the Firebase Function with explicit configuration
const httpsOptions: HttpsOptions = {
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 10,
};

// Export the function - this is what gets deployed
export const api = onRequest(httpsOptions, app);
