# 🚀 Quick Start: Firebase Emulators with Auto Port Sync

## TL;DR

```bash
# Terminal 1: Start Firebase emulators
cd umoyo-health-hub
pnpm run emulators:start

# Terminal 2: Start frontend (after you see "✓ Functions emulator is running")
cd apps/web
pnpm dev

# 🎉 Visit http://localhost:3000
```

## What Just Happened?

The `emulators:start` command automatically:
1. ✅ Found available ports (no conflicts!)
2. ✅ Started Firebase emulators
3. ✅ Updated your `.env` file with correct port
4. ✅ Connected frontend to backend

## Common Issues & Quick Fixes

### ❌ "ERR_CONNECTION_REFUSED"

```bash
# Step 1: Verify emulators are running
# Look for this in Terminal 1:
# ✓ Functions emulator is running on port 5001

# Step 2: Restart frontend (important!)
# In Terminal 2:
Ctrl+C
pnpm dev
```

### ❌ "Port already in use"

No problem! The auto-discovery will find another port. Just restart:

```bash
Ctrl+C  # Stop emulators
pnpm run emulators:start  # Restart (will find new ports)
```

### ❌ Frontend connects but gets 404

Check the path. It should be:
```
http://localhost:5001/umoyo-health-hub/us-central1/api/trpc
```

Run:
```bash
pnpm run emulators:sync  # Re-sync the correct URL
cd apps/web
# Restart dev server
```

## Available Commands

```bash
# Start everything (recommended)
pnpm run emulators:start              # All emulators
pnpm run emulators:start:functions    # Functions only

# Manual control
pnpm run emulators:configure          # Find available ports
pnpm run emulators:sync               # Update .env once
pnpm run emulators:sync:watch         # Keep syncing
pnpm run emulators:sync:wait          # Wait for emulator then sync
```

## Check Your Setup

### 1. Is the backend running?

```bash
# Windows
netstat -ano | findstr "5001"

# macOS/Linux
lsof -i :5001

# Should show something listening on port 5001
```

### 2. Is the .env correct?

```bash
# Check your .env file
cat apps/web/.env  # macOS/Linux
type apps\web\.env # Windows

# Should contain:
# VITE_TRPC_URL=http://localhost:5001/umoyo-health-hub/us-central1/api/trpc
```

### 3. Test the backend directly

```bash
# Try this in your browser or curl:
http://localhost:5001/umoyo-health-hub/us-central1/api/trpc

# Should return tRPC metadata (not a 404)
```

## Daily Development Workflow

```bash
# Morning routine:
cd umoyo-health-hub

# Terminal 1
pnpm run emulators:start

# Terminal 2  
cd apps/web
pnpm dev

# Afternoon coding session:
# Both terminals still running from morning
# Make changes, hot reload works ✨

# End of day:
# Ctrl+C in both terminals
```

## Important Notes

⚠️ **Always restart Vite after .env changes!**
```bash
cd apps/web
Ctrl+C  # Stop
pnpm dev  # Start
```

✅ **First time? Build functions first:**
```bash
cd functions
pnpm install
pnpm build
```

🔍 **See detailed logs:**
```bash
firebase emulators:start --debug
```

## Need More Help?

- 📖 Full documentation: `docs/EMULATOR-PORT-SYNC.md`
- 🐛 Troubleshooting: See the troubleshooting section in the full docs
- 💬 Check Firebase emulator logs in Terminal 1

## Port Reference

Default port ranges (auto-discovered):
- **Functions**: 5000-5999 (your tRPC API)
- **Emulator UI**: 6000-7000 (web interface)
- **Firestore**: 8000-8999
- **Auth**: 9000-9099

Your frontend connects to the **Functions** port automatically!

