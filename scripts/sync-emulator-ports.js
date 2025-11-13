const fs = require('fs');
const path = require('path');
const net = require('net');

/**
 * Script to automatically sync Firebase emulator ports to frontend .env file
 * 
 * This script:
 * 1. Reads dynamic ports from .emulator-ports.json
 * 2. Verifies the Functions emulator is actually running
 * 3. Updates the web app's .env file with the correct VITE_TRPC_URL
 * 4. Optionally watches for changes (if --watch flag is passed)
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
const ENV_FILE = path.join(PROJECT_ROOT, 'apps/web/.env');
const FIREBASE_CONFIG = path.join(PROJECT_ROOT, 'firebase.json');

// Firebase project configuration (read from firebase.json)
let FIREBASE_PROJECT_ID = 'umoyo-health-hub';
let FIREBASE_REGION = 'us-central1';

/**
 * Read Firebase configuration to get project ID
 */
function readFirebaseConfig() {
  try {
    if (fs.existsSync(FIREBASE_CONFIG)) {
      const config = JSON.parse(fs.readFileSync(FIREBASE_CONFIG, 'utf8'));
      // Project ID is typically in the file or we keep the default
      log.info('Firebase config loaded');
    }
  } catch (error) {
    log.warning(`Could not read firebase.json: ${error.message}`);
  }
}

/**
 * Check if a port is actually in use (emulator is running)
 */
function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(2000); // Increased timeout for reliability
    
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
 * Verify the Functions emulator is actually responding (not just port open)
 */
async function verifyFunctionsEmulator(port) {
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: `/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api/health`,
        method: 'GET',
        timeout: 3000,
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // If we get any response, the emulator is working
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

/**
 * Read the emulator ports from .emulator-ports.json
 */
function readEmulatorPorts() {
  if (!fs.existsSync(EMULATOR_PORTS_FILE)) {
    throw new Error(
      `.emulator-ports.json not found at ${EMULATOR_PORTS_FILE}\n` +
      'Please run "pnpm run emulators:configure" first'
    );
  }
  
  const portsData = fs.readFileSync(EMULATOR_PORTS_FILE, 'utf8');
  return JSON.parse(portsData);
}

/**
 * Read the current .env file
 */
function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    log.warning(`.env file not found at ${ENV_FILE}`);
    return {};
  }
  
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      return;
    }
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return envVars;
}

/**
 * Update the .env file with new VITE_TRPC_URL
 */
function updateEnvFile(functionsPort) {
  const newTrpcUrl = `http://localhost:${functionsPort}/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api/trpc`;
  
  if (!fs.existsSync(ENV_FILE)) {
    log.error(`.env file not found at ${ENV_FILE}`);
    log.info('Creating new .env file...');
    
    const envContent = `# Firebase Configuration\nVITE_TRPC_URL=${newTrpcUrl}\n`;
    fs.writeFileSync(ENV_FILE, envContent);
    log.success('Created new .env file');
    return true;
  }
  
  // Read the current env file
  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = envContent.split('\n');
  let updated = false;
  
  // Check if VITE_TRPC_URL exists
  const trpcUrlLineIndex = lines.findIndex(line => 
    line.trim().startsWith('VITE_TRPC_URL=')
  );
  
  if (trpcUrlLineIndex !== -1) {
    const oldValue = lines[trpcUrlLineIndex];
    lines[trpcUrlLineIndex] = `VITE_TRPC_URL=${newTrpcUrl}`;
    
    if (oldValue !== lines[trpcUrlLineIndex]) {
      updated = true;
      log.info(`Old: ${oldValue}`);
      log.info(`New: ${lines[trpcUrlLineIndex]}`);
    }
  } else {
    // Add VITE_TRPC_URL to the end
    lines.push(`VITE_TRPC_URL=${newTrpcUrl}`);
    updated = true;
    log.info(`Added: VITE_TRPC_URL=${newTrpcUrl}`);
  }
  
  if (updated) {
    fs.writeFileSync(ENV_FILE, lines.join('\n'));
    return true;
  }
  
  return false;
}

/**
 * Wait for emulator to be ready with exponential backoff
 */
async function waitForEmulator(port, maxAttempts = 30, initialDelay = 1000) {
  log.info(`Waiting for Functions emulator on port ${port}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isRunning = await isPortInUse(port);
    
    if (isRunning) {
      log.success(`Functions emulator is running on port ${port}`);
      return true;
    }
    
    const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), 10000);
    
    if (attempt < maxAttempts) {
      process.stdout.write(
        `${COLORS.yellow}⏳${COLORS.reset} Attempt ${attempt}/${maxAttempts} - ` +
        `Waiting ${Math.round(delay / 1000)}s...\r`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  log.error(`Timeout: Functions emulator not detected on port ${port} after ${maxAttempts} attempts`);
  return false;
}

/**
 * Main sync function
 */
async function syncPorts(waitForReady = false) {
  try {
    log.header('🔄 Syncing Emulator Ports to Frontend');
    
    // Read Firebase config
    readFirebaseConfig();
    
    // Read emulator ports
    log.info('Reading emulator ports configuration...');
    const ports = readEmulatorPorts();
    
    if (!ports.functions) {
      throw new Error('Functions port not found in .emulator-ports.json');
    }
    
    const functionsPort = ports.functions;
    log.success(`Functions emulator configured on port: ${functionsPort}`);
    
    // Check if emulator is running
    if (waitForReady) {
      const isReady = await waitForEmulator(functionsPort);
      if (!isReady) {
        log.warning('Proceeding with update despite emulator not being ready...');
      } else {
        // Double-check with health endpoint
        const isHealthy = await verifyFunctionsEmulator(functionsPort);
        if (isHealthy) {
          log.success('✅ Functions emulator is healthy and responding');
        } else {
          log.warning('⚠️  Port is open but emulator may not be fully ready');
        }
      }
    } else {
      const isRunning = await isPortInUse(functionsPort);
      if (!isRunning) {
        log.warning(`Functions emulator is not running on port ${functionsPort}`);
        log.info('The .env file will be updated, but you need to start the emulators');
      } else {
        // Verify it's actually responding
        const isHealthy = await verifyFunctionsEmulator(functionsPort);
        if (isHealthy) {
          log.success('✅ Functions emulator is healthy and responding');
        } else {
          log.warning('⚠️  Port is open but emulator may not be fully initialized');
          log.info('This is normal if emulators just started. Wait a few seconds.');
        }
      }
    }
    
    // Update .env file
    log.info('Updating .env file...');
    const updated = updateEnvFile(functionsPort);
    
    if (updated) {
      log.success('✨ .env file updated successfully!');
      log.info('');
      log.info(`${COLORS.bright}Next steps:${COLORS.reset}`);
      log.info('1. Restart your Vite dev server to pick up the new environment variable');
      log.info('2. If emulators are not running, start them with: pnpm run emulators:start');
      log.info('');
      log.success(`Frontend will connect to: http://localhost:${functionsPort}/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api/trpc`);
    } else {
      log.info('No changes needed - .env file is already up to date');
    }
    
    return true;
  } catch (error) {
    log.error(`Error syncing ports: ${error.message}`);
    return false;
  }
}

/**
 * Watch mode - monitor for changes
 */
function watchMode() {
  log.header('👀 Watch Mode Enabled');
  log.info('Monitoring .emulator-ports.json for changes...');
  log.info('Press Ctrl+C to stop\n');
  
  // Initial sync
  syncPorts(false);
  
  // Watch for changes
  let debounceTimer;
  fs.watch(EMULATOR_PORTS_FILE, (eventType) => {
    if (eventType === 'change') {
      // Debounce rapid changes
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        log.info('\n📝 Detected change in emulator ports...');
        syncPorts(false);
      }, 500);
    }
  });
  
  // Also watch firebase.json for changes
  if (fs.existsSync(FIREBASE_CONFIG)) {
    fs.watch(FIREBASE_CONFIG, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          log.info('\n📝 Detected change in firebase.json...');
          readFirebaseConfig();
          syncPorts(false);
        }, 500);
      }
    });
  }
}

/**
 * Display help
 */
function showHelp() {
  console.log(`
${COLORS.bright}${COLORS.cyan}Firebase Emulator Port Sync${COLORS.reset}

Automatically syncs Firebase emulator ports to the frontend .env file.

${COLORS.bright}Usage:${COLORS.reset}
  node scripts/sync-emulator-ports.js [options]

${COLORS.bright}Options:${COLORS.reset}
  --watch, -w       Watch for changes and continuously sync
  --wait, -W        Wait for emulator to be ready before syncing
  --help, -h        Show this help message

${COLORS.bright}Examples:${COLORS.reset}
  node scripts/sync-emulator-ports.js
    Sync ports once and exit

  node scripts/sync-emulator-ports.js --watch
    Continuously watch for port changes

  node scripts/sync-emulator-ports.js --wait
    Wait for emulator to start before syncing

${COLORS.bright}Integration:${COLORS.reset}
  This script is automatically run by:
    pnpm run emulators:start
    pnpm run emulators:start:functions
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  watch: args.includes('--watch') || args.includes('-w'),
  wait: args.includes('--wait') || args.includes('-W'),
  help: args.includes('--help') || args.includes('-h'),
};

// Main execution
if (flags.help) {
  showHelp();
  process.exit(0);
}

if (flags.watch) {
  watchMode();
} else {
  syncPorts(flags.wait).then(success => {
    process.exit(success ? 0 : 1);
  });
}

