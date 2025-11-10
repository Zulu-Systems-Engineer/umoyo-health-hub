# ✅ Port Sync System - Setup Complete!

## What Was The Problem?

Your frontend was trying to connect to:
```
❌ http://localhost:6001/umoyo-health-hub/us-central1/api/trpc
```

But your Firebase Functions emulator was running on:
```
✅ http://localhost:5001/umoyo-health-hub/us-central1/api/trpc
```

**Port 6001** = Firebase Emulator UI (web interface)  
**Port 5001** = Firebase Functions (your tRPC API)

## What Was Fixed?

### 1. ✅ Corrected the .env file
Your `apps/web/.env` now has the correct port:
```env
VITE_TRPC_URL=http://localhost:5001/umoyo-health-hub/us-central1/api/trpc
```

### 2. ✅ Created Automatic Port Sync System

Three new scripts that work together:

**`scripts/sync-emulator-ports.js`**
- Reads emulator ports from `.emulator-ports.json`
- Verifies Functions emulator is running
- Automatically updates `apps/web/.env` with correct URL
- Supports watch mode for continuous syncing

**`scripts/start-emulators-with-sync.js`**
- Orchestrates the entire startup process
- Configures ports → Syncs → Starts emulators
- Cross-platform (Windows, macOS, Linux)
- Handles graceful shutdown

**`scripts/configure-emulators.js`** (already existed)
- Finds available ports to avoid conflicts
- Updates `firebase.json`
- Creates `.emulator-ports.json`

### 3. ✅ Updated npm Scripts

New convenient commands in `package.json`:

```json
{
  "emulators:start": "Start all emulators with auto-sync",
  "emulators:start:functions": "Start Functions only",
  "emulators:sync": "Manually sync ports",
  "emulators:sync:watch": "Continuously watch and sync",
  "emulators:sync:wait": "Wait for emulator then sync"
}
```

### 4. ✅ Created Documentation

- **`QUICK-START-EMULATORS.md`** - Quick reference guide
- **`docs/EMULATOR-PORT-SYNC.md`** - Complete documentation
- **`scripts/README.md`** - Scripts reference
- **`.gitignore`** - Updated to ignore `.emulator-ports.json`

## How To Use It Now?

### Quick Start (Recommended)

```bash
# Terminal 1: Start Firebase emulators (with auto port sync)
cd umoyo-health-hub
c

# Wait for: "✓ Functions emulator is running on port 5001"

# Terminal 2: Start frontend
cd apps/web
pnpm dev

# 🎉 Visit http://localhost:3000
```

### What Happens Automatically?

1. ✅ Finds available ports (avoids conflicts)
2. ✅ Starts Firebase emulators on those ports
3. ✅ Waits for Functions emulator to be ready
4. ✅ Updates your `.env` with correct URL
5. ✅ Logs success message with connection URL

### Manual Control

```bash
# Just configure ports
pnpm run emulators:configure

# Just sync ports to .env
pnpm run emulators:sync

# Sync and wait for emulator
pnpm run emulators:sync:wait

# Watch for port changes
pnpm run emulators:sync:watch
```

## Next Steps

### 1. ⚠️ Restart Your Vite Dev Server

The `.env` file was updated, but Vite only reads it at startup:

```bash
cd apps/web
# Press Ctrl+C to stop
pnpm dev
```

### 2. 🚀 Start Firebase Emulators

If not already running:

```bash
cd umoyo-health-hub
pnpm run emulators:start
```

Look for this message:
```
✓ Functions emulator is running on port 5001
✓ Frontend will connect to: http://localhost:5001/...
```

### 3. ✅ Test The Connection

In your browser at `http://localhost:3000`:
- Try the chat interface
- Send a message
- Should work without `ERR_CONNECTION_REFUSED` ✨

## Troubleshooting

### Still getting connection errors?

```bash
# 1. Check emulators are running
pnpm run emulators:sync
# Look for: "✓ Functions emulator is running on port 5001"

# 2. Check .env file
cat apps/web/.env  # macOS/Linux
type apps\web\.env # Windows
# Should show: VITE_TRPC_URL=http://localhost:5001/...

# 3. IMPORTANT: Restart Vite dev server
cd apps/web
Ctrl+C
pnpm dev
```

### Port still wrong?

```bash
# Re-run sync
pnpm run emulators:sync

# Then restart Vite
cd apps/web
Ctrl+C
pnpm dev
```

### Emulators won't start?

```bash
# Check if something is using port 5001
netstat -ano | findstr "5001"  # Windows
lsof -i :5001                  # macOS/Linux

# If so, kill it or let the auto-discovery find another port
pnpm run emulators:start
```

## Files Changed/Created

### Modified
- ✅ `package.json` - Added new scripts
- ✅ `apps/web/.env` - Fixed VITE_TRPC_URL (6001 → 5001)
- ✅ `.gitignore` - Added `.emulator-ports.json`

### Created
- ✅ `scripts/sync-emulator-ports.js` - Main sync script
- ✅ `scripts/start-emulators-with-sync.js` - Orchestrator
- ✅ `scripts/README.md` - Scripts documentation
- ✅ `docs/EMULATOR-PORT-SYNC.md` - Detailed guide
- ✅ `QUICK-START-EMULATORS.md` - Quick reference
- ✅ `SETUP-SUMMARY.md` - This file

### Auto-Generated
- ✅ `.emulator-ports.json` - Dynamic port config (gitignored)

## Key Features

### 🔍 Dynamic Port Discovery
Never worry about port conflicts again. The system automatically finds available ports.

### 🔄 Automatic Sync
No more manually updating `.env` files. Everything syncs automatically.

### ⏳ Smart Waiting
The sync script waits for emulators to be ready before updating (exponential backoff).

### 👀 Watch Mode
Continuously monitor for port changes during development.

### 🎨 Beautiful Output
Colored terminal output with clear status indicators:
- 🔧 Configuration
- ✓ Success
- ⚠ Warnings
- ✗ Errors

### 🌍 Cross-Platform
Works perfectly on Windows, macOS, and Linux.

## Understanding The Port System

```
Firebase Emulators Architecture:

┌─────────────────────────────────────────┐
│   Emulator UI (Port 6001)               │
│   Web interface for all emulators       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Functions Emulator (Port 5001)        │  ← Your tRPC API
│   /umoyo-health-hub/us-central1/api/*   │  ← Frontend connects here
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Firestore Emulator (Port 8000)        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Auth Emulator (Port 9000)             │
└─────────────────────────────────────────┘
```

Your React app connects to **Port 5001** (Functions), not the UI port!

## Testing The Fix

### Before (with wrong port):
```javascript
console.log(import.meta.env.VITE_TRPC_URL);
// http://localhost:6001/... ❌ (UI port)

// Result: ERR_CONNECTION_REFUSED
```

### After (with correct port):
```javascript
console.log(import.meta.env.VITE_TRPC_URL);
// http://localhost:5001/... ✅ (Functions port)

// Result: Connection successful! 🎉
```

## Documentation Links

- 📖 [Quick Start Guide](QUICK-START-EMULATORS.md)
- 📚 [Complete Documentation](docs/EMULATOR-PORT-SYNC.md)
- 🔧 [Scripts Reference](scripts/README.md)
- 🔥 [Firebase Functions README](functions/README.md)

## Common Commands Reference

```bash
# Development (most common)
pnpm run emulators:start        # Start everything

# Debugging
pnpm run emulators:sync         # Check/fix port sync
firebase emulators:start --debug # Verbose emulator logs

# Manual control
pnpm run emulators:configure    # Find ports
pnpm run emulators:sync:wait    # Sync when ready
pnpm run emulators:sync:watch   # Watch mode
```

## Success Indicators

You'll know it's working when you see:

✅ **In emulator terminal:**
```
✓ Functions emulator is running on port 5001
✓ Frontend will connect to: http://localhost:5001/...
```

✅ **In browser console:**
```
🔧 Using VITE_TRPC_URL: http://localhost:5001/...
```

✅ **No errors:**
```
❌ ERR_CONNECTION_REFUSED  ← Should NOT see this anymore
```

## Support

If you encounter any issues:

1. Read `QUICK-START-EMULATORS.md` for quick fixes
2. Check `docs/EMULATOR-PORT-SYNC.md` for detailed troubleshooting
3. Run `pnpm run emulators:sync` to see diagnostic output
4. Check Firebase emulator logs

## Summary

✅ **Problem identified:** Wrong port in `.env` (6001 instead of 5001)  
✅ **Immediate fix:** Updated `.env` file manually  
✅ **Long-term solution:** Automated port sync system  
✅ **Documentation:** Comprehensive guides created  
✅ **Testing:** Script tested and working  

**You're all set! 🎉**

Just remember to:
1. Start emulators: `pnpm run emulators:start`
2. Restart Vite when `.env` changes
3. Check the console for connection URL

Happy coding! 🚀

