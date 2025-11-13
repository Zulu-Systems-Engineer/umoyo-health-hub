const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

/**
 * Port Discovery Service
 * 
 * This service runs alongside Firebase emulators and provides a simple HTTP endpoint
 * that returns the current emulator port configuration. This allows the frontend
 * to dynamically discover ports at runtime without needing environment variables.
 * 
 * Usage:
 *   node scripts/port-discovery-service.js [--port PORT]
 * 
 * The service exposes:
 *   GET /ports - Returns JSON with all emulator ports
 *   GET /health - Health check endpoint
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  warning: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  header: (msg) => console.log(`\n${COLORS.bright}${COLORS.cyan}${msg}${COLORS.reset}\n`),
};

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EMULATOR_PORTS_FILE = path.join(PROJECT_ROOT, '.emulator-ports.json');
const FIREBASE_CONFIG = path.join(PROJECT_ROOT, 'firebase.json');

// Parse command line arguments
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const SERVICE_PORT = portIndex !== -1 ? parseInt(args[portIndex + 1]) : 3100;

// Firebase project configuration
let FIREBASE_PROJECT_ID = 'umoyo-health-hub';
let FIREBASE_REGION = 'us-central1';

/**
 * Read Firebase configuration
 */
function readFirebaseConfig() {
  try {
    if (fs.existsSync(FIREBASE_CONFIG)) {
      const config = JSON.parse(fs.readFileSync(FIREBASE_CONFIG, 'utf8'));
      log.info('Firebase config loaded');
      return config;
    }
  } catch (error) {
    log.warning(`Could not read firebase.json: ${error.message}`);
  }
  return null;
}

/**
 * Read emulator ports
 */
function readEmulatorPorts() {
  try {
    if (fs.existsSync(EMULATOR_PORTS_FILE)) {
      const portsData = fs.readFileSync(EMULATOR_PORTS_FILE, 'utf8');
      return JSON.parse(portsData);
    }
  } catch (error) {
    log.warning(`Could not read .emulator-ports.json: ${error.message}`);
  }
  return null;
}

/**
 * Check if a port is in use
 */
async function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

/**
 * Get emulator status
 */
async function getEmulatorStatus(ports) {
  const status = {};
  
  for (const [service, port] of Object.entries(ports)) {
    status[service] = {
      port,
      available: await isPortInUse(port),
    };
  }
  
  return status;
}

/**
 * Handle /ports endpoint
 */
async function handlePortsRequest(req, res) {
  const ports = readEmulatorPorts();
  
  if (!ports) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: '.emulator-ports.json not found',
      message: 'Run "pnpm run emulators:configure" first'
    }));
    return;
  }
  
  const status = await getEmulatorStatus(ports);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  
  res.end(JSON.stringify({
    project: FIREBASE_PROJECT_ID,
    region: FIREBASE_REGION,
    ports,
    status,
    trpcUrl: `http://localhost:${ports.functions}/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api/trpc`,
    timestamp: new Date().toISOString(),
  }, null, 2));
}

/**
 * Handle /health endpoint
 */
function handleHealthRequest(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  
  res.end(JSON.stringify({
    status: 'ok',
    service: 'port-discovery-service',
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Create HTTP server
 */
function createServer() {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for all requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }
    
    // Route requests
    if (req.url === '/ports' || req.url === '/api/ports') {
      await handlePortsRequest(req, res);
    } else if (req.url === '/health' || req.url === '/api/health') {
      handleHealthRequest(req, res);
    } else if (req.url === '/' || req.url === '/api') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({
        service: 'Firebase Emulator Port Discovery Service',
        version: '1.0.0',
        endpoints: {
          ports: '/ports',
          health: '/health'
        }
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  return server;
}

/**
 * Main execution
 */
async function main() {
  log.header('🔍 Starting Port Discovery Service');
  
  // Read Firebase config
  readFirebaseConfig();
  
  // Check if port is available
  const portAvailable = !(await isPortInUse(SERVICE_PORT));
  if (!portAvailable) {
    log.error(`Port ${SERVICE_PORT} is already in use`);
    log.info('Try a different port with: node scripts/port-discovery-service.js --port 3101');
    process.exit(1);
  }
  
  // Create and start server
  const server = createServer();
  
  server.listen(SERVICE_PORT, '127.0.0.1', () => {
    log.success(`Port Discovery Service running on http://localhost:${SERVICE_PORT}`);
    log.info('');
    log.info('Available endpoints:');
    log.info(`  ${COLORS.cyan}GET http://localhost:${SERVICE_PORT}/ports${COLORS.reset}   - Get all emulator ports`);
    log.info(`  ${COLORS.cyan}GET http://localhost:${SERVICE_PORT}/health${COLORS.reset}  - Health check`);
    log.info('');
    log.info('Press Ctrl+C to stop');
  });
  
  // Watch for changes to .emulator-ports.json
  if (fs.existsSync(EMULATOR_PORTS_FILE)) {
    fs.watch(EMULATOR_PORTS_FILE, (eventType) => {
      if (eventType === 'change') {
        log.info('📝 Detected change in emulator ports configuration');
      }
    });
  }
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    log.header('🛑 Shutting down Port Discovery Service');
    server.close(() => {
      log.success('Service stopped');
      process.exit(0);
    });
  });
}

// Run
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

