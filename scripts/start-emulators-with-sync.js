const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Cross-platform script to start Firebase emulators with automatic port syncing
 * 
 * This script:
 * 1. Configures emulator ports (finds available ports)
 * 2. Starts the sync script in the background
 * 3. Starts Firebase emulators
 * 4. Handles graceful shutdown
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

// Resolve important paths so this script works regardless of CWD
const SCRIPTS_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..');

// Track child processes for cleanup
const childProcesses = [];

// Parse command line arguments
const args = process.argv.slice(2);
const functionsOnly = args.includes('--functions-only') || args.includes('-f');

/**
 * Run a command and return a promise
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log.info(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: options.cwd || PROJECT_ROOT,
      ...options
    });
    
    childProcesses.push(child);
    
    child.on('error', (error) => {
      log.error(`Failed to start process: ${error.message}`);
      reject(error);
    });
    
    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

/**
 * Run a command in the background
 */
function runCommandBackground(command, args, label) {
  log.info(`Starting ${label}...`);
  
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: false,
    cwd: PROJECT_ROOT
  });
  
  childProcesses.push(child);
  
  // Log output with prefix
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${COLORS.cyan}[${label}]${COLORS.reset} ${line}`);
    });
  });
  
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${COLORS.yellow}[${label}]${COLORS.reset} ${line}`);
    });
  });
  
  child.on('error', (error) => {
    log.error(`${label} error: ${error.message}`);
  });
  
  return child;
}

/**
 * Cleanup function to kill all child processes
 */
function cleanup() {
  log.header('🛑 Shutting down...');
  
  childProcesses.forEach(child => {
    try {
      if (child && !child.killed) {
        log.info(`Stopping process ${child.pid}...`);
        
        // On Windows, use taskkill to kill the process tree
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { shell: true });
        } else {
          child.kill('SIGTERM');
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  });
  
  log.success('Cleanup complete');
  process.exit(0);
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

/**
 * Main execution
 */
async function main() {
  try {
    log.header('🚀 Starting Firebase Emulators with Auto Port Sync');
    
    // Inform if user ran from a different directory
    if (process.cwd() !== PROJECT_ROOT) {
      log.warning(`Detected CWD: ${process.cwd()}`);
      log.info(`Using project root: ${PROJECT_ROOT}`);
    }




    // Pre-step: Ensure Functions are built (lib/index.js exists)
    const functionsLib = path.join(PROJECT_ROOT, 'functions', 'lib', 'index.js');
    const functionsNodeModules = path.join(PROJECT_ROOT, 'functions', 'node_modules');
    if (!fs.existsSync(functionsNodeModules)) {
      log.header('Pre-step: Install Firebase Functions dependencies');
      await runCommand('pnpm', ['install'], { cwd: path.join(PROJECT_ROOT, 'functions') });
      log.success('Dependencies installed');
    }
    if (!fs.existsSync(functionsLib)) {
      log.header('Pre-step: Build Firebase Functions');
      await runCommand('pnpm', ['run', 'build'], { cwd: path.join(PROJECT_ROOT, 'functions') });
      log.success('Functions built successfully');
    }

    // Step 1: Configure emulator ports
    log.header('Step 1: Configure Emulator Ports');
    await runCommand('node', [`"${path.join(SCRIPTS_DIR, 'configure-emulators.js')}"`]);
    log.success('Port configuration complete');
    
    // Step 2: Start the port discovery service
    log.header('Step 2: Start Port Discovery Service');
    const discoveryProcess = runCommandBackground(
      'node',
      [`"${path.join(SCRIPTS_DIR, 'port-discovery-service.js')}"`],
      'Port Discovery'
    );
    
    // Give the discovery service a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Start the sync script with --wait flag in background
    log.header('Step 3: Start Port Sync Service');
    const syncProcess = runCommandBackground(
      'node',
      [`"${path.join(SCRIPTS_DIR, 'sync-emulator-ports.js')}"`, '--wait'],
      'Port Sync'
    );
    
    // Give the sync script a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Start Firebase emulators
    log.header('Step 4: Start Firebase Emulators');
    const emulatorArgs = ['emulators:start'];
    if (functionsOnly) {
      emulatorArgs.push('--only', 'functions');
      log.info('Starting Functions emulator only');
    }
    
    // This will run until interrupted
    await runCommand('firebase', emulatorArgs, { cwd: PROJECT_ROOT });
    
  } catch (error) {
    log.error(`Error: ${error.message}`);
    cleanup();
    process.exit(1);
  }
}

// Run
main();

