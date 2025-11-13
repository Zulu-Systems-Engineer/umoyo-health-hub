# Troubleshooting Guide

## ❌ Error: `net::ERR_CONNECTION_REFUSED`

### Symptom
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
http://localhost:5000/umoyo-health-hub/us-central1/api/trpc
```

### Root Cause
Firebase emulators are **not running**, even though the configuration files exist.

### Solution

**Step 1: Start Firebase Emulators**
```bash
# In terminal 1 (from umoyo-health-hub directory)
pnpm run emulators:start

# Or manually:
firebase emulators:start
```

**Step 2: Wait for Emulators to be Ready**
Look for these messages:
```
✔  functions[us-central1-api]: http function initialized (http://localhost:5001/...)
✔  All emulators ready!
```

**Step 3: Restart Vite Dev Server** (IMPORTANT!)
```bash
# In terminal 2 (apps/web directory)
# Press Ctrl+C to stop Vite
pnpm dev
```

> **Why restart?** Vite caches environment variables at startup. After `.env` changes, you MUST restart Vite.

**Step 4: Hard Refresh Browser**
- Windows/Linux: `Ctrl + Shift + R`
- macOS: `Cmd + Shift + R`

### Verify It's Working

**Check 1: Test Backend Health**
```bash
curl http://localhost:5001/umoyo-health-hub/us-central1/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "umoyo-health-hub-api",
  "timestamp": "...",
  "endpoints": {
    "trpc": "/api/trpc",
    "health": "/api/health"
  }
}
```

**Check 2: Run Test Suite**
```bash
pnpm run emulators:test
```

Expected output: All green checkmarks ✅

**Check 3: Browser Console**
Open DevTools console, should see:
```
🔧 Using VITE_TRPC_URL from env: http://localhost:5001/...
```

(Note: Port 5001, not 5000!)

---

## ❌ Error: Port Mismatch

### Symptom
- `.env` file says port 5000
- `firebase.json` says port 5001
- Backend not responding

### Solution

**Fix Configuration:**
```bash
# Sync ports to match firebase.json
pnpm run emulators:sync

# Or manually edit .emulator-ports.json to match firebase.json
```

**Restart Everything:**
```bash
# Stop emulators (Ctrl+C)
# Stop Vite (Ctrl+C)

# Start emulators
pnpm run emulators:start

# Start Vite (in new terminal)
cd apps/web
pnpm dev
```

---

## ❌ Error: Functions Not Compiled

### Symptom
```
Error: Cannot find module './lib/index.js'
```

### Solution

**Build Functions:**
```bash
cd functions
npm run build

# Or use pnpm:
pnpm run build
```

**Verify Compilation:**
```bash
# Check if lib folder exists
ls functions/lib
```

---

## ❌ Error: Port Already in Use

### Symptom
```
Port 5001 is not available
```

### Solution

**Option 1: Kill Process Using Port**
```bash
# Windows
netstat -ano | findstr ":5001"
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5001 | xargs kill -9
```

**Option 2: Let System Find Available Port**
```bash
# The configure script will find another port
pnpm run emulators:configure
pnpm run emulators:start
```

The dynamic port discovery system will automatically detect the new port!

---

## ❌ Error: Frontend Using Wrong Port

### Symptom
Frontend connects to wrong port after port changes

### Solution

**1. Clear Browser Cache**
- Hard refresh: `Ctrl + Shift + R`
- Or clear sessionStorage:
  ```javascript
  // In browser console
  sessionStorage.clear()
  ```

**2. Restart Vite Dev Server**
```bash
# Ctrl+C to stop
pnpm dev
```

**3. Verify .env File**
```bash
cat apps/web/.env | grep VITE_TRPC_URL
```

Should match the port in `firebase.json`!

**4. Resync if Needed**
```bash
pnpm run emulators:sync
```

---

## 🔍 Diagnostic Commands

### Check Port Configuration
```bash
# What ports are configured?
cat .emulator-ports.json

# What does firebase.json say?
cat firebase.json | grep -A 2 "functions"

# What does .env say?
cat apps/web/.env | grep VITE_TRPC_URL
```

### Check What's Running
```bash
# Are emulators running?
firebase emulators:exec "echo Emulators are running"

# What's listening on port 5001?
netstat -ano | findstr ":5001"

# Test backend directly
curl http://localhost:5001/umoyo-health-hub/us-central1/api/health
```

### Full System Test
```bash
pnpm run emulators:test
```

---

## 📋 Pre-flight Checklist

Before starting development, ensure:

- [ ] Functions are compiled (`ls functions/lib`)
- [ ] Firebase emulators are running (`curl http://localhost:5001/...`)
- [ ] .env file is correct (`cat apps/web/.env`)
- [ ] Vite dev server restarted after .env changes
- [ ] Browser cache cleared (hard refresh)

---

## 🚨 Common Mistake

### The #1 Issue: Not Restarting Vite

**Why this happens:**
- You update `.env` file
- Emulators start on new port
- But Vite is still running with OLD port cached

**Solution:**
```bash
# ALWAYS restart Vite after .env changes!
Ctrl+C  # Stop Vite
pnpm dev  # Restart Vite
```

---

## 🎯 Quick Fix Workflow

If something's not working:

```bash
# 1. Stop everything
Ctrl+C  # Stop emulators
Ctrl+C  # Stop Vite

# 2. Clean start
cd umoyo-health-hub
pnpm run emulators:start  # Terminal 1

# 3. Wait for "All emulators ready!"

# 4. Start frontend
cd apps/web
pnpm dev  # Terminal 2

# 5. Hard refresh browser
Ctrl+Shift+R
```

**This fixes 95% of issues!**

---

## 🆘 Still Not Working?

### Run Full Diagnostics
```bash
# 1. Check configuration
cat .emulator-ports.json
cat firebase.json | grep -A 2 "functions"
cat apps/web/.env | grep VITE_TRPC_URL

# 2. Test emulators
pnpm run emulators:test

# 3. Check what's running
netstat -ano | findstr ":5001"
curl http://localhost:5001/umoyo-health-hub/us-central1/api/health

# 4. Check functions compiled
ls functions/lib

# 5. Check browser console
# Look for error messages and port discovery logs
```

### Get Help
Include this information:
- Output of `pnpm run emulators:test`
- Contents of `.emulator-ports.json`
- Contents of `apps/web/.env`
- Browser console errors
- Emulator terminal output

---

## ✅ Success Indicators

You know it's working when:

1. **Emulators show:**
   ```
   ✔  functions[us-central1-api]: http function initialized
   ✔  All emulators ready!
   ```

2. **Test passes:**
   ```bash
   $ pnpm run emulators:test
   Passed: 5, Failed: 0, Warnings: 0
   ```

3. **Browser console shows:**
   ```
   🔧 Using VITE_TRPC_URL from env: http://localhost:5001/...
   ```

4. **Backend responds:**
   ```bash
   $ curl http://localhost:5001/.../api/health
   {"status":"ok","service":"umoyo-health-hub-api",...}
   ```

5. **No connection errors in browser network tab**

---

## 📚 Related Documentation

- Full technical docs: `docs/DYNAMIC-PORT-DISCOVERY.md`
- Quick start guide: `QUICK-START-PORT-DISCOVERY.md`
- Implementation details: `IMPLEMENTATION-SUMMARY.md`
- Change log: `CHANGES.md`

