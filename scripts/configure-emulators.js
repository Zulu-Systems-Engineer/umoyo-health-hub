const fs = require('fs');
const net = require('net');
const path = require('path');

// Configuration for port ranges
const PORT_RANGES = {
  ui: { start: 6001, end: 7000 },
  functions: { start: 5000, end: 5999 },
  hub: { start: 6400, end: 6499 },
  logging: { start: 6500, end: 6599 },
  firestore: { start: 8000, end: 8999 },
  auth: { start: 9000, end: 9099 },
  storage: { start: 9100, end: 9299 },
  eventarc: { start: 9300, end: 9399 },
  dataconnect: { start: 9400, end: 9499 },
  tasks: { start: 9500, end: 9599 }
};

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

// Find an available port in a range
async function findAvailablePort(start, end) {
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${start} and ${end}`);
}

// Find available ports for all services
async function findAvailablePorts() {
  const ports = {};
  
  for (const [service, range] of Object.entries(PORT_RANGES)) {
    try {
      ports[service] = await findAvailablePort(range.start, range.end);
      console.log(`Found available port for ${service}: ${ports[service]}`);
    } catch (error) {
      console.error(`Error finding port for ${service}:`, error.message);
      process.exit(1);
    }
  }
  
  return ports;
}

// Update firebase.json with new ports
async function updateFirebaseConfig() {
  const projectRoot = path.resolve(__dirname, '..');
  const configPath = path.join(projectRoot, 'firebase.json');
  
  try {
    // Read existing config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Find available ports
    const ports = await findAvailablePorts();
    
    // Update emulators configuration
    config.emulators = config.emulators || {};
    
    // Update each service's port
    for (const [service, port] of Object.entries(ports)) {
      config.emulators[service] = {
        ...config.emulators[service],
        host: '127.0.0.1',
        port
      };
    }
    
    // Add single project mode
    config.emulators.singleProjectMode = true;
    
    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Successfully updated firebase.json with available ports');
    
    // Create a temporary file to store the ports for other processes
    const portsPath = path.join(projectRoot, '.emulator-ports.json');
    fs.writeFileSync(portsPath, JSON.stringify(ports, null, 2));
    
  } catch (error) {
    console.error('Error updating firebase.json:', error.message);
    process.exit(1);
  }
}

// Run the configuration
updateFirebaseConfig().catch(console.error);