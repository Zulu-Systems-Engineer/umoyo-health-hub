import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
// @ts-expect-error - AppRouter type will be available after functions are built
import type { AppRouter } from '../../../functions/src/index';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Common ports to try for Firebase Functions emulator
 */
const COMMON_PORTS = [5001, 5000, 6001, 8080, 5002];
const PROJECT_ID = 'umoyo-health-hub';
const REGION = 'us-central1';
const TRPC_PATH = '/api/trpc';

/**
 * Test if a backend URL is responding
 */
async function testBackendUrl(url: string, timeout = 2000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Try to hit the health endpoint or just the base URL
    const testUrl = url.replace('/trpc', '/health');
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    
    // If health endpoint doesn't exist, that's okay - the port is responding
    return response !== null;
  } catch (error) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Try to fetch port information from the port discovery service
 */
async function fetchFromDiscoveryService(): Promise<string | null> {
  const discoveryPorts = [3100, 3101, 3102]; // Common ports for discovery service
  
  for (const port of discoveryPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/ports`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(1000),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.trpcUrl) {
          console.log(`📡 Got backend URL from discovery service: ${data.trpcUrl}`);
          return data.trpcUrl;
        }
      }
    } catch (error) {
      // Service not available on this port, try next
      continue;
    }
  }
  
  return null;
}

/**
 * Dynamically discover the backend port at runtime
 */
async function discoverBackendPort(): Promise<string | null> {
  console.log('🔍 Starting dynamic port discovery...');
  
  // Strategy 1: Try the port discovery service first (fastest and most reliable)
  const discoveryUrl = await fetchFromDiscoveryService();
  if (discoveryUrl) {
    return discoveryUrl;
  }
  
  console.log('📡 Discovery service not available, trying direct port scan...');
  
  // Strategy 2: Try all common ports in parallel
  const testPromises = COMMON_PORTS.map(async (port) => {
    const url = `http://localhost:${port}/${PROJECT_ID}/${REGION}${TRPC_PATH}`;
    const isAvailable = await testBackendUrl(url, 1500);
    
    if (isAvailable) {
      console.log(`✅ Found backend on port ${port}`);
      return url;
    }
    console.log(`❌ Port ${port} not responding`);
    return null;
  });

  const results = await Promise.all(testPromises);
  const workingUrl = results.find(url => url !== null);
  
  return workingUrl || null;
}

/**
 * Get the backend URL with intelligent port discovery
 */
export function getBackendUrl(): string {
  // 1. Check env var first (highest priority - set at build time)
  if (import.meta.env.VITE_TRPC_URL) {
    console.log(`🔧 Using VITE_TRPC_URL from env: ${import.meta.env.VITE_TRPC_URL}`);
    return import.meta.env.VITE_TRPC_URL;
  }

  // 2. Try to read from sessionStorage (runtime cache)
  if (typeof window !== 'undefined') {
    const cachedUrl = sessionStorage.getItem('DISCOVERED_BACKEND_URL');
    if (cachedUrl) {
      console.log(`💾 Using cached backend URL: ${cachedUrl}`);
      return cachedUrl;
    }
  }

  // 3. Default fallback (will be replaced by runtime discovery)
  const defaultUrl = `http://localhost:5001/${PROJECT_ID}/${REGION}${TRPC_PATH}`;
  console.log(`⚠️  Using default backend URL: ${defaultUrl}`);
  console.log(`💡 Tip: Set VITE_TRPC_URL env var or let runtime discovery find the correct port`);
  
  return defaultUrl;
}

/**
 * Initialize runtime port discovery
 * This runs asynchronously and updates the client if a different port is found
 */
async function initializeRuntimeDiscovery() {
  // Skip if we already have env var set
  if (import.meta.env.VITE_TRPC_URL) {
    return;
  }

  // Skip if we already cached a working URL this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('DISCOVERED_BACKEND_URL')) {
    return;
  }

  console.log('🚀 Initializing runtime backend discovery...');
  
  const discoveredUrl = await discoverBackendPort();
  
  if (discoveredUrl && typeof window !== 'undefined') {
    console.log(`✨ Successfully discovered backend at: ${discoveredUrl}`);
    sessionStorage.setItem('DISCOVERED_BACKEND_URL', discoveredUrl);
    
    // Notify user to reload if the discovered URL is different from default
    const currentUrl = getBackendUrl();
    if (discoveredUrl !== currentUrl) {
      console.warn('🔄 Backend URL changed! Please refresh the page to use the correct port.');
      console.warn(`   Current: ${currentUrl}`);
      console.warn(`   Discovered: ${discoveredUrl}`);
    }
  } else {
    console.warn('⚠️  Could not discover backend port. Using default. Make sure Firebase emulators are running.');
    console.warn('   Try running: pnpm run emulators:start');
  }
}

// Start runtime discovery (non-blocking)
if (typeof window !== 'undefined') {
  initializeRuntimeDiscovery().catch(err => {
    console.error('Error during runtime discovery:', err);
  });
}

export function createClient() {
  const backendUrl = getBackendUrl();
  
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: backendUrl,
        
        // Important: Add headers
        headers: () => ({
          'Content-Type': 'application/json',
        }),
        
        // Important: Include credentials
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'omit',
            mode: 'cors',
          });
        },
      }),
    ],
  });
}

export const trpcClient = createClient();

