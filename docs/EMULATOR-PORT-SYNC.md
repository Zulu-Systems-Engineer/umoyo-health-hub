# Firebase Emulator Port Sync System

## Overview

This system automatically discovers available ports for Firebase emulators and syncs them to the frontend's `.env` file, ensuring seamless connectivity between your React frontend and Firebase Functions backend.

## The Problem We Solve

When running Firebase emulators locally, you might encounter:
- **Port conflicts** - Default ports (5001, 9000, etc.) might already be in use
- **Frontend connection errors** - Frontend tries to connect to the wrong port
- **Manual configuration** - Having to manually update `.env` files after port changes

## The Solution

Our automated system:
1. 🔍 **Discovers available ports** dynamically when starting emulators
2. 🔄 **Updates Firebase configuration** (`firebase.json`) with available ports
3. ✅ **Verifies emulators are running** before syncing
4. 🎯 **Automatically updates frontend `.env`** with the correct tRPC URL
5. 👀 **Optionally watches for changes** to keep everything in sync

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Emulator Startup Flow                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Configure Emulators (configure-emulators.js)            │
│     • Scans port ranges for availability                     │
│     • Updates firebase.json with available ports            │
│     • Creates .emulator-ports.json                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Sync Ports (sync-emulator-ports.js)                     │
│     • Reads .emulator-ports.json                            │
│     • Waits for Functions emulator to be ready              │
│     • Updates apps/web/.env with VITE_TRPC_URL              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Start Firebase Emulators                                │
│     • Functions emulator on discovered port                 │
│     • Other emulators as configured                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Frontend Connects                                       │
│     • Vite reads VITE_TRPC_URL from .env                   │
│     • tRPC client connects to correct port                  │
│     • ✨ Everything works seamlessly                         │
└─────────────────────────────────────────────────────────────┘
```

## Files Involved

### 1. `scripts/configure-emulators.js`
**Purpose:** Find available ports and update `firebase.json`

**What it does:**
- Scans predefined port ranges for each emulator service
- Finds the first available port in each range
- Updates `firebase.json` with the discovered ports
- Creates `.emulator-ports.json` for other scripts to read

**Port Ranges:**
```javascript
{
  ui: 6000-7000,
  functions: 5000-5999,
  firestore: 8000-8999,
  auth: 9000-9099,
  storage: 9100-9299,
  // ... etc
}
```

### 2. `scripts/sync-emulator-ports.js`
**Purpose:** Sync emulator ports to frontend `.env` file

**What it does:**
- Reads port configuration from `.emulator-ports.json`
- Verifies the Functions emulator is actually running (optional)
- Updates `apps/web/.env` with the correct `VITE_TRPC_URL`
- Supports watch mode to continuously monitor for changes

**Key Features:**
- ⏳ **Wait mode** - Waits for emulator to start before syncing (exponential backoff)
- 👀 **Watch mode** - Continuously monitors for port changes
- 🎨 **Colored output** - Easy to read terminal output
- 🛡️ **Error handling** - Graceful handling of missing files or ports

### 3. `scripts/start-emulators-with-sync.js`
**Purpose:** Orchestrate the entire startup process (Windows-compatible)

**What it does:**
- Runs configuration script
- Starts sync script in background
- Starts Firebase emulators
- Handles graceful shutdown (Ctrl+C cleanup)

**Cross-platform support:**
- Works on Windows, macOS, and Linux
- Properly handles process cleanup on Windows

### 4. `.emulator-ports.json`
**Purpose:** Store discovered ports for other scripts

**Example:**
```json
{
  "ui": 6001,
  "functions": 5001,
  "hub": 6401,
  "logging": 6501,
  "firestore": 8000,
  "auth": 9000,
  "storage": 9100,
  "eventarc": 9301,
  "dataconnect": 9400,
  "tasks": 9501
}
```

### 5. `apps/web/.env`
**Purpose:** Frontend environment variables (updated by sync script)

**Example:**
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
# ... other Firebase config ...
VITE_TRPC_URL=http://localhost:5001/umoyo-health-hub/us-central1/api/trpc
```

## Usage

### Quick Start (Recommended)

Start everything with automatic port sync:

```bash
# Start all emulators with auto-sync
pnpm run emulators:start

# Or start only Functions emulator
pnpm run emulators:start:functions
```

This automatically:
1. Finds available ports
2. Starts the sync service
3. Starts Firebase emulators
4. Updates your `.env` file

### Manual Commands

For more control, use individual commands:

```bash
# 1. Configure ports (finds available ports)
pnpm run emulators:configure

# 2. Sync ports to .env (one-time)
pnpm run emulators:sync

# 3. Sync and wait for emulator to be ready
pnpm run emulators:sync:wait

# 4. Watch for changes continuously
pnpm run emulators:sync:watch
```

### Development Workflow

**First time setup:**

```bash
# 1. Start emulators (in one terminal)
cd umoyo-health-hub
pnpm run emulators:start

# 2. Wait for "✓ Functions emulator is running" message

# 3. Start frontend (in another terminal)
cd umoyo-health-hub/apps/web
pnpm dev
```

**Daily development:**

```bash
# Terminal 1: Start emulators (auto-syncs ports)
pnpm run emulators:start

# Terminal 2: Start frontend
cd apps/web
pnpm dev
```

**After port changes:**

If you manually change ports in `firebase.json`, restart:

```bash
# Stop emulators (Ctrl+C)
# Restart with:
pnpm run emulators:start
```

The sync script will automatically update `.env` with new ports.

## Troubleshooting

### Issue: "ERR_CONNECTION_REFUSED"

**Cause:** Frontend is trying to connect to wrong port or emulators aren't running.

**Solution:**
```bash
# 1. Check if emulators are running
pnpm run emulators:sync

# 2. Look for the success message showing the port
# Example: "Frontend will connect to: http://localhost:5001/..."

# 3. Restart your Vite dev server to pick up new .env
cd apps/web
# Stop dev server (Ctrl+C)
pnpm dev
```

### Issue: ".env file not updated"

**Cause:** Sync script might have failed or .env file doesn't exist.

**Solution:**
```bash
# Manually run sync
pnpm run emulators:sync

# Check the output for errors
# If needed, create .env manually in apps/web/
```

### Issue: "Port already in use"

**Cause:** Default ports are occupied by another application.

**Solution:**
The port discovery system should automatically find available ports. If it fails:

```bash
# 1. Check what's using the port
netstat -ano | findstr "5001"  # Windows
lsof -i :5001                  # macOS/Linux

# 2. Kill the process or use a different port range
# Edit scripts/configure-emulators.js to change port ranges

# 3. Reconfigure
pnpm run emulators:configure
```

### Issue: "Cannot find .emulator-ports.json"

**Cause:** Configuration script hasn't been run yet.

**Solution:**
```bash
# Run configuration first
pnpm run emulators:configure

# Then sync
pnpm run emulators:sync
```

### Issue: "Sync script times out waiting for emulator"

**Cause:** Functions emulator is taking too long to start or failed to start.

**Solution:**
```bash
# 1. Check Firebase emulator logs for errors

# 2. Try building functions first
cd functions
pnpm build

# 3. Start emulators manually to see errors
firebase emulators:start --only functions
```

### Issue: "Frontend still connecting to wrong port after sync"

**Cause:** Vite dev server caches environment variables at startup.

**Solution:**
```bash
# MUST restart Vite dev server after .env changes
cd apps/web
# Stop server (Ctrl+C)
pnpm dev
```

## Advanced Usage

### Watch Mode

Keep ports synced continuously (useful during development):

```bash
# In a separate terminal
pnpm run emulators:sync:watch
```

This monitors `.emulator-ports.json` and `firebase.json` for changes.

### Wait Mode

Wait for emulator to be ready before syncing:

```bash
pnpm run emulators:sync:wait
```

Features:
- Exponential backoff (1s → 1.5s → 2.25s → ...)
- Maximum 30 attempts
- Progress indicator
- Timeout after ~5 minutes

### Custom Port Ranges

Edit `scripts/configure-emulators.js`:

```javascript
const PORT_RANGES = {
  functions: { start: 5000, end: 5999 },  // Change these
  ui: { start: 6000, end: 7000 },
  // ... etc
};
```

### Environment Variables

The sync script automatically constructs the tRPC URL:

```javascript
VITE_TRPC_URL = http://localhost:{FUNCTIONS_PORT}/{PROJECT_ID}/{REGION}/api/trpc
```

Where:
- `FUNCTIONS_PORT`: From `.emulator-ports.json`
- `PROJECT_ID`: `umoyo-health-hub` (from `firebase.json`)
- `REGION`: `us-central1` (Firebase default)
- Path: `/api/trpc` (your tRPC endpoint)

### Debugging

Enable verbose output:

```bash
# Add console.log statements or use Node inspector
node --inspect scripts/sync-emulator-ports.js
```

Check what ports are being used:

```bash
# Windows
netstat -ano | findstr "500 600 800 900"

# macOS/Linux  
lsof -i :5001 -i :6001 -i :8000 -i :9000
```

## How It Works Internally

### Port Discovery Algorithm

```javascript
1. For each emulator service:
   a. Get port range (e.g., functions: 5000-5999)
   b. Iterate through range
   c. Try to bind to port
   d. If successful, port is available
   e. Record port and move to next service
   
2. Update firebase.json with discovered ports
3. Write .emulator-ports.json for sync script
```

### Sync Algorithm

```javascript
1. Read .emulator-ports.json
2. Extract functions port (e.g., 5001)
3. If --wait flag:
   a. Check if port is in use
   b. If not, wait with exponential backoff
   c. Retry up to 30 times
4. Construct tRPC URL
5. Read apps/web/.env
6. Update or add VITE_TRPC_URL
7. Write updated .env file
```

### Watch Mode Algorithm

```javascript
1. Perform initial sync
2. Watch .emulator-ports.json for changes
3. Watch firebase.json for changes
4. On change:
   a. Debounce (wait 500ms)
   b. Re-run sync
   c. Log changes
```

## Integration with Existing Scripts

The port sync system integrates seamlessly:

```json
{
  "scripts": {
    // Manual control
    "emulators:configure": "Find available ports",
    "emulators:sync": "Sync ports once",
    "emulators:sync:watch": "Continuously sync",
    "emulators:sync:wait": "Wait for emulator then sync",
    
    // Recommended: All-in-one
    "emulators:start": "Configure + Sync + Start",
    "emulators:start:functions": "Same but functions only"
  }
}
```

## Best Practices

### ✅ Do's

- ✅ Use `pnpm run emulators:start` for automated setup
- ✅ Restart Vite dev server after `.env` changes
- ✅ Add `.emulator-ports.json` to `.gitignore` (it's dynamic)
- ✅ Keep `.env` in `.gitignore` (contains project-specific config)
- ✅ Use watch mode during active development
- ✅ Check emulator logs if connection fails

### ❌ Don'ts

- ❌ Don't manually edit `.emulator-ports.json` (auto-generated)
- ❌ Don't commit `.env` files with local ports
- ❌ Don't skip restarting Vite after port changes
- ❌ Don't mix manual port changes with auto-discovery
- ❌ Don't rely on default ports (5001) always being available

## FAQ

**Q: Do I need to run sync manually every time?**  
A: No! `pnpm run emulators:start` automatically runs configuration and sync.

**Q: Why do I need to restart the Vite dev server?**  
A: Vite reads environment variables only at startup. Changes to `.env` won't be picked up until restart.

**Q: Can I use fixed ports instead of dynamic discovery?**  
A: Yes! Just manually set ports in `firebase.json` and run `pnpm run emulators:sync` to update `.env`.

**Q: What if I have multiple Firebase projects?**  
A: Update the `FIREBASE_PROJECT_ID` constant in `sync-emulator-ports.js` or make it read from `firebase.json`.

**Q: Does this work in CI/CD?**  
A: Yes! Use `pnpm run emulators:start` in your CI scripts. Default ports usually work in clean CI environments.

**Q: Can I sync to multiple .env files?**  
A: Currently syncs to `apps/web/.env` only. Modify `sync-emulator-ports.js` to add more paths.

**Q: What about production deployment?**  
A: This system is for local development only. Production uses actual Firebase URLs from your project.

## Contributing

When modifying the port sync system:

1. Test on both Windows and macOS/Linux
2. Ensure graceful error handling
3. Update this documentation
4. Test with both `--watch` and `--wait` modes
5. Verify cleanup works (Ctrl+C should kill all processes)

## Related Files

- `firebase.json` - Emulator configuration
- `.emulator-ports.json` - Discovered ports (auto-generated, don't commit)
- `apps/web/.env` - Frontend environment variables (don't commit)
- `apps/web/.env.example` - Template for .env (commit this)
- `apps/web/src/lib/trpc-client.ts` - tRPC client that reads VITE_TRPC_URL

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `pnpm run emulators:sync` manually to see detailed error messages
3. Check Firebase emulator logs: `firebase emulators:start --debug`
4. Verify ports: `netstat -ano` (Windows) or `lsof -i` (macOS/Linux)

## License

Part of the Umoyo Health Hub project.

