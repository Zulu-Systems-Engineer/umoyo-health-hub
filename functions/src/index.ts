import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initializeServices } from './init';
import { appRouter } from './router';
import { createContext } from './context';

// --- START LAZY INITIALIZATION FIX ---
let servicesInitialized = false;

const ensureInitialized = () => {
  if (!servicesInitialized) {
    console.log('--- Lazy Initializing Services (Cold Start) ---');
    initializeServices();
    servicesInitialized = true;
    console.log('--- Services Initialized Successfully ---');
  }
};
// --- END LAZY INITIALIZATION FIX ---

console.log('Creating Express app...');
const app = express();

// Enable CORS for all origins
// Your config is perfect.
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

// Export the function
export const api = onRequest(httpsOptions, app);