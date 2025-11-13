const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Test script for port discovery system
 * 
 * This script tests:
 * 1. .emulator-ports.json exists and is valid
 * 2. Port Discovery Service is running and responding
 * 3. Backend health endpoint is accessible
 * 4. All URLs are correctly formatted
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
const ROOT_DIR = process.cwd();
const EMULATOR_PORTS_FILE = path.join(ROOT_DIR, '.emulator-ports.json');
const PROJECT_ID = 'umoyo-health-hub';
const REGION = 'us-central1';
const DISCOVERY_PORTS = [3100, 3101, 3102];

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

/**
 * Make HTTP GET request
 */
function httpGet(url, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout,
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

/**
 * Test 1: Check .emulator-ports.json
 */
async function testEmulatorPortsFile() {
  log.header('Test 1: Emulator Ports Configuration');
  
  try {
    if (!fs.existsSync(EMULATOR_PORTS_FILE)) {
      log.error('.emulator-ports.json not found');
      log.info('Run: pnpm run emulators:configure');
      testResults.failed++;
      return null;
    }
    
    log.success('.emulator-ports.json exists');
    
    const content = fs.readFileSync(EMULATOR_PORTS_FILE, 'utf8');
    const ports = JSON.parse(content);
    
    log.success('File is valid JSON');
    
    if (!ports.functions) {
      log.error('Missing "functions" port configuration');
      testResults.failed++;
      return null;
    }
    
    log.success(`Functions port: ${ports.functions}`);
    
    // Check all expected services
    const expectedServices = ['ui', 'functions', 'hub', 'logging', 'firestore', 'auth'];
    let allPresent = true;
    
    for (const service of expectedServices) {
      if (!ports[service]) {
        log.warning(`Missing "${service}" port`);
        testResults.warnings++;
        allPresent = false;
      }
    }
    
    if (allPresent) {
      log.success('All expected services configured');
    }
    
    testResults.passed++;
    return ports;
  } catch (error) {
    log.error(`Error reading ports file: ${error.message}`);
    testResults.failed++;
    return null;
  }
}

/**
 * Test 2: Check Port Discovery Service
 */
async function testDiscoveryService() {
  log.header('Test 2: Port Discovery Service');
  
  let serviceFound = false;
  let servicePort = null;
  let serviceData = null;
  
  for (const port of DISCOVERY_PORTS) {
    try {
      const url = `http://localhost:${port}/ports`;
      log.info(`Trying ${url}...`);
      
      const response = await httpGet(url, 2000);
      
      if (response.status === 200) {
        log.success(`Discovery service found on port ${port}`);
        serviceFound = true;
        servicePort = port;
        serviceData = response.data;
        break;
      }
    } catch (error) {
      // Service not on this port, continue
    }
  }
  
  if (!serviceFound) {
    log.warning('Port Discovery Service not running');
    log.info('Start with: pnpm run emulators:discovery');
    log.info('This is optional - frontend can discover ports directly');
    testResults.warnings++;
    return null;
  }
  
  // Verify service response
  if (!serviceData.ports || !serviceData.trpcUrl) {
    log.error('Discovery service returned invalid data');
    testResults.failed++;
    return null;
  }
  
  log.success(`Service provides port info: ${JSON.stringify(serviceData.ports, null, 2)}`);
  log.success(`tRPC URL: ${serviceData.trpcUrl}`);
  
  // Test health endpoint
  try {
    const healthUrl = `http://localhost:${servicePort}/health`;
    const healthResponse = await httpGet(healthUrl, 2000);
    
    if (healthResponse.status === 200 && healthResponse.data.status === 'ok') {
      log.success('Health endpoint working');
    } else {
      log.warning('Health endpoint returned unexpected response');
      testResults.warnings++;
    }
  } catch (error) {
    log.warning(`Health endpoint error: ${error.message}`);
    testResults.warnings++;
  }
  
  testResults.passed++;
  return serviceData;
}

/**
 * Test 3: Check Backend Health
 */
async function testBackendHealth(ports) {
  log.header('Test 3: Backend Health Endpoint');
  
  if (!ports || !ports.functions) {
    log.error('No functions port available to test');
    testResults.failed++;
    return false;
  }
  
  const functionsPort = ports.functions;
  const healthUrl = `http://localhost:${functionsPort}/${PROJECT_ID}/${REGION}/api/health`;
  
  try {
    log.info(`Testing ${healthUrl}...`);
    const response = await httpGet(healthUrl, 3000);
    
    if (response.status === 200) {
      log.success('Backend health endpoint responding');
      
      if (response.data.status === 'ok') {
        log.success('Backend is healthy');
        log.info(`Service: ${response.data.service}`);
        log.info(`Endpoints: ${JSON.stringify(response.data.endpoints)}`);
      } else {
        log.warning('Backend returned non-OK status');
        testResults.warnings++;
      }
      
      testResults.passed++;
      return true;
    } else {
      log.error(`Backend returned status ${response.status}`);
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log.error(`Backend not responding: ${error.message}`);
    log.info('Make sure Firebase emulators are running:');
    log.info('  pnpm run emulators:start');
    testResults.failed++;
    return false;
  }
}

/**
 * Test 4: Check tRPC Endpoint
 */
async function testTrpcEndpoint(ports) {
  log.header('Test 4: tRPC Endpoint');
  
  if (!ports || !ports.functions) {
    log.error('No functions port available to test');
    testResults.failed++;
    return false;
  }
  
  const functionsPort = ports.functions;
  const trpcUrl = `http://localhost:${functionsPort}/${PROJECT_ID}/${REGION}/api/trpc`;
  
  try {
    log.info(`Testing ${trpcUrl}...`);
    const response = await httpGet(trpcUrl, 3000);
    
    // tRPC should respond to GET requests, even if with an error
    // (it expects POST with proper payload)
    if (response.status >= 200 && response.status < 500) {
      log.success('tRPC endpoint is accessible');
      log.info(`Status: ${response.status} (expected - tRPC expects POST with payload)`);
      testResults.passed++;
      return true;
    } else {
      log.error(`tRPC endpoint returned status ${response.status}`);
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log.error(`tRPC endpoint not responding: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Test 5: Verify .env file
 */
async function testEnvFile(ports) {
  log.header('Test 5: Frontend .env Configuration');
  
  const envFile = path.join(ROOT_DIR, 'apps/web/.env');
  
  try {
    if (!fs.existsSync(envFile)) {
      log.warning('.env file not found at apps/web/.env');
      log.info('This is OK - frontend will use runtime discovery');
      log.info('To create: pnpm run emulators:sync');
      testResults.warnings++;
      return;
    }
    
    log.success('.env file exists');
    
    const content = fs.readFileSync(envFile, 'utf8');
    const trpcUrlMatch = content.match(/VITE_TRPC_URL=(.+)/);
    
    if (!trpcUrlMatch) {
      log.warning('VITE_TRPC_URL not found in .env');
      log.info('This is OK - frontend will use runtime discovery');
      testResults.warnings++;
      return;
    }
    
    const configuredUrl = trpcUrlMatch[1].trim();
    log.success(`Configured URL: ${configuredUrl}`);
    
    if (ports && ports.functions) {
      const expectedUrl = `http://localhost:${ports.functions}/${PROJECT_ID}/${REGION}/api/trpc`;
      
      if (configuredUrl === expectedUrl) {
        log.success('.env file matches current configuration');
      } else {
        log.warning('.env file port does not match current configuration');
        log.info(`  Expected: ${expectedUrl}`);
        log.info(`  Got:      ${configuredUrl}`);
        log.info('Run: pnpm run emulators:sync');
        testResults.warnings++;
      }
    }
    
    testResults.passed++;
  } catch (error) {
    log.error(`Error reading .env file: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Print summary
 */
function printSummary() {
  log.header('Test Summary');
  
  console.log(`${COLORS.green}Passed:${COLORS.reset}   ${testResults.passed}`);
  console.log(`${COLORS.red}Failed:${COLORS.reset}   ${testResults.failed}`);
  console.log(`${COLORS.yellow}Warnings:${COLORS.reset} ${testResults.warnings}`);
  console.log('');
  
  if (testResults.failed === 0) {
    log.success('All critical tests passed! ✨');
    
    if (testResults.warnings > 0) {
      log.warning('Some warnings detected - system will work but may not be optimal');
    }
    
    console.log('');
    log.info('Your dynamic port discovery system is working correctly!');
    log.info('');
    log.info('Next steps:');
    log.info('  1. Start frontend: cd apps/web && pnpm dev');
    log.info('  2. Open browser: http://localhost:3000');
    log.info('  3. Check console for port discovery messages');
    
    return 0;
  } else {
    log.error('Some tests failed - please fix the issues above');
    console.log('');
    log.info('Common fixes:');
    log.info('  1. Configure ports: pnpm run emulators:configure');
    log.info('  2. Start emulators: pnpm run emulators:start');
    log.info('  3. Sync .env file: pnpm run emulators:sync');
    
    return 1;
  }
}

/**
 * Main execution
 */
async function main() {
  console.clear();
  log.header('🧪 Port Discovery System Test');
  log.info('Testing all components of the dynamic port discovery system...');
  console.log('');
  
  // Run tests
  const ports = await testEmulatorPortsFile();
  const discoveryData = await testDiscoveryService();
  
  // Use discovery service data if available, otherwise use file data
  const testPorts = discoveryData?.ports || ports;
  
  if (testPorts) {
    await testBackendHealth(testPorts);
    await testTrpcEndpoint(testPorts);
    await testEnvFile(testPorts);
  }
  
  // Print summary
  const exitCode = printSummary();
  process.exit(exitCode);
}

// Run tests
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

