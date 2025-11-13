# Quick Start: Dynamic Port Discovery

## TL;DR - Just Run This

```bash
# Terminal 1: Start emulators with auto port discovery
cd umoyo-health-hub
pnpm run emulators:start

# Terminal 2: Start frontend (after emulators are ready)
cd apps/web
pnpm dev

# That's it! Everything works automatically! 🎉
```

## What This Does

The system automatically:
1. ✅ Finds available ports (no conflicts!)
2. ✅ Starts a port discovery service
3. ✅ Updates your `.env` file
4. ✅ Starts Firebase emulators
5. ✅ Frontend automatically discovers the correct port

**You never need to manually edit port numbers!**

## Test Your Setup

```bash
# Test all components
pnpm run emulators:test

# Should show all green checkmarks if emulators are running
```

## Common Commands

```bash
# Start everything (recommended)
pnpm run emulators:start

# Start only functions emulator
pnpm run emulators:start:functions

# Manually configure ports (rarely needed)
pnpm run emulators:configure

# Manually sync .env (rarely needed)
pnpm run emulators:sync

# Test port discovery
pnpm run emulators:test
```

## How It Works

### 1. Automatic Port Discovery
When you start the frontend, it automatically:
- Checks environment variable (`VITE_TRPC_URL`)
- Queries the port discovery service
- Tests common ports in parallel
- Caches the result for fast subsequent loads

### 2. Console Messages
Open browser DevTools and look for:
```
🔍 Starting dynamic port discovery...
📡 Got backend URL from discovery service: http://localhost:5000/...
✨ Successfully discovered backend at: http://localhost:5000/...
```

### 3. No Configuration Needed
The system works out of the box. No `.env` edits, no manual port configuration!

## Troubleshooting

### "Backend not connecting"

**Check:**
```bash
# Are emulators running?
pnpm run emulators:test

# Start them if not:
pnpm run emulators:start
```

### "Port already in use"

**This is fine!** The system will automatically find another available port.

The emulator might start on port 5000, 5001, 5002, etc. - **the frontend will automatically find it**.

### "Frontend using wrong port"

**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Clear sessionStorage (DevTools → Application → Storage)
3. Restart Vite dev server

Or just wait - the discovery runs automatically and will suggest a refresh if the port changed.

### Still not working?

**Manual test:**
```bash
# 1. Check configuration
cat .emulator-ports.json

# 2. Test backend directly
curl http://localhost:5000/umoyo-health-hub/us-central1/api/health

# 3. Check discovery service
curl http://localhost:3100/ports

# 4. Run full test suite
pnpm run emulators:test
```

## Advanced Usage

### Start Components Separately

```bash
# Terminal 1: Port discovery service
pnpm run emulators:discovery

# Terminal 2: Emulators
firebase emulators:start

# Terminal 3: Frontend
cd apps/web
pnpm dev
```

### Watch Mode (Auto-sync .env on port changes)

```bash
pnpm run emulators:sync:watch
```

### Custom Discovery Service Port

```bash
node scripts/port-discovery-service.js --port 3101
```

## Architecture Overview

```
Frontend (React/Vite)
    ↓
Runtime Discovery
    ├─ 1. Check env var
    ├─ 2. Check cache
    ├─ 3. Query discovery service (fast!)
    ├─ 4. Test ports in parallel
    └─ 5. Default fallback
    ↓
Backend (Firebase Functions)
    ├─ GET /api/health (health check)
    └─ POST /api/trpc (your API)
```

## Files You Don't Need to Touch

- ❌ `firebase.json` - Auto-updated
- ❌ `.emulator-ports.json` - Auto-generated
- ❌ `apps/web/.env` - Auto-synced
- ❌ Port configuration - Auto-discovered

**Just run `pnpm run emulators:start` and everything works!**

## What to Commit

```bash
# Commit these:
✅ scripts/*.js
✅ docs/*.md
✅ package.json

# DON'T commit these:
❌ .emulator-ports.json (gitignored)
❌ apps/web/.env (gitignored or template only)
```

## For Production

The discovery system is **development-only**. In production:

```bash
# Set explicit URL
VITE_TRPC_URL=https://your-production-url.com/api/trpc

# Or use Cloud Functions URL directly
VITE_TRPC_URL=https://us-central1-umoyo-health-hub.cloudfunctions.net/api/trpc
```

## Need Help?

1. **Read the full documentation:** `docs/DYNAMIC-PORT-DISCOVERY.md`
2. **Run the test:** `pnpm run emulators:test`
3. **Check console logs:** Open DevTools and look for 🔍 messages
4. **Check emulator logs:** Look at the terminal running emulators

## Summary

✅ **One command to start:** `pnpm run emulators:start`  
✅ **Automatic port discovery:** No manual configuration  
✅ **Multiple fallback strategies:** Always works  
✅ **Fast:** ~10-50ms discovery time  
✅ **Developer-friendly:** Helpful console messages  
✅ **Production-ready:** Override with env vars  

**The system "just works" - focus on building features! 🚀**

