# Scripts Directory

This directory contains automation scripts for the Umoyo Health Hub project.

## Scripts Overview

### 🔧 `configure-emulators.js`

**Purpose:** Dynamically discover available ports for Firebase emulators to avoid port conflicts.

**What it does:**
- Scans predefined port ranges for each Firebase service
- Finds the first available port in each range
- Updates `firebase.json` with discovered ports
- Creates `.emulator-ports.json` for other scripts

**Usage:**
```bash
node scripts/configure-emulators.js
```

**Port Ranges:**
- Functions: 5000-5999
- UI: 6000-7000
- Firestore: 8000-8999
- Auth: 9000-9099
- Storage: 9100-9299
- And more...

---

### 🔄 `sync-emulator-ports.js`

**Purpose:** Automatically sync Firebase emulator ports to frontend `.env` file.

**What it does:**
- Reads discovered ports from `.emulator-ports.json`
- Verifies Functions emulator is running (optional)
- Updates `apps/web/.env` with correct `VITE_TRPC_URL`
- Supports watch mode for continuous syncing

**Usage:**
```bash
# Sync once
node scripts/sync-emulator-ports.js

# Wait for emulator to be ready before syncing
node scripts/sync-emulator-ports.js --wait

# Continuously watch for changes
node scripts/sync-emulator-ports.js --watch

# Show help
node scripts/sync-emulator-ports.js --help
```

**Features:**
- ⏳ Exponential backoff when waiting for emulator
- 👀 File watching for continuous sync
- 🎨 Colored terminal output
- 🛡️ Graceful error handling

---

### 🚀 `start-emulators-with-sync.js`

**Purpose:** Orchestrate the complete emulator startup process with automatic port syncing.

**What it does:**
- Runs port configuration
- Starts port sync in background
- Starts Firebase emulators
- Handles graceful shutdown

**Usage:**
```bash
# Start all emulators
node scripts/start-emulators-with-sync.js

# Start only Functions emulator
node scripts/start-emulators-with-sync.js --functions-only
```

**Features:**
- ✅ Cross-platform (Windows, macOS, Linux)
- 🧹 Proper process cleanup on exit
- 📊 Combined log output from all processes
- 🎯 Integrated workflow

**Note:** This is the recommended way to start emulators during development.

---

## npm/pnpm Scripts

These scripts are integrated into `package.json`:

```bash
# Recommended: All-in-one commands
pnpm run emulators:start              # Start all emulators with auto-sync
pnpm run emulators:start:functions    # Start Functions emulator only

# Manual control commands
pnpm run emulators:configure          # Configure ports only
pnpm run emulators:sync               # Sync ports once
pnpm run emulators:sync:watch         # Continuously sync
pnpm run emulators:sync:wait          # Wait for emulator then sync
```

## Workflow

### Standard Development Flow

```
1. Developer runs: pnpm run emulators:start
   ↓
2. configure-emulators.js finds available ports
   ↓
3. Updates firebase.json and creates .emulator-ports.json
   ↓
4. start-emulators-with-sync.js orchestrates:
   - Starts sync-emulator-ports.js with --wait flag
   - Starts Firebase emulators
   ↓
5. sync-emulator-ports.js waits for Functions emulator
   ↓
6. Updates apps/web/.env with correct VITE_TRPC_URL
   ↓
7. Frontend can now connect to backend ✨
```

### Watch Mode Flow

```
1. Developer runs: pnpm run emulators:sync:watch
   ↓
2. sync-emulator-ports.js monitors for changes
   ↓
3. If .emulator-ports.json or firebase.json changes:
   - Re-reads configuration
   - Updates .env file
   - Logs changes
   ↓
4. Continues watching indefinitely
```

## Files Created/Modified

### Created Files

- `.emulator-ports.json` - Dynamic port configuration (gitignored)
  ```json
  {
    "ui": 6001,
    "functions": 5001,
    "firestore": 8000,
    ...
  }
  ```

### Modified Files

- `firebase.json` - Updated with available ports
- `apps/web/.env` - Updated with `VITE_TRPC_URL`

## Troubleshooting

### Script won't run

```bash
# Check Node.js version
node --version  # Should be >= 22.0.0

# Check file permissions
ls -l scripts/  # macOS/Linux
dir scripts\    # Windows
```

### Port discovery fails

```bash
# Check if ports are available
netstat -ano | findstr "5001"  # Windows
lsof -i :5001                  # macOS/Linux

# If ports are occupied, kill the process or change ranges
# Edit PORT_RANGES in configure-emulators.js
```

### Sync fails

```bash
# Check if .emulator-ports.json exists
cat .emulator-ports.json

# If not, run configuration first
pnpm run emulators:configure

# Then try sync again
pnpm run emulators:sync
```

### Watch mode doesn't detect changes

```bash
# File watching uses Node's fs.watch
# Some systems might have issues

# Workaround: Manually run sync after changes
pnpm run emulators:sync
```

## Development

### Adding New Scripts

1. Create script in `scripts/` directory
2. Add to `package.json` scripts section
3. Document in this README
4. Test on Windows, macOS, and Linux

### Modifying Port Ranges

Edit `scripts/configure-emulators.js`:

```javascript
const PORT_RANGES = {
  myService: { start: 7000, end: 7999 },
  ...
};
```

### Debugging Scripts

```bash
# Enable Node.js inspector
node --inspect scripts/sync-emulator-ports.js

# Add verbose logging
# (Add console.log statements to scripts)

# Check script output
node scripts/sync-emulator-ports.js 2>&1 | tee output.log
```

## Platform-Specific Notes

### Windows

- Uses PowerShell commands for some operations
- Process cleanup uses `taskkill /f /t`
- Path separators handled automatically by Node.js

### macOS/Linux

- Uses POSIX commands
- Process cleanup uses `SIGTERM` signal
- Bash-style commands in examples

### Cross-Platform Testing

All scripts are tested on:
- Windows 10/11 (PowerShell)
- macOS (Zsh/Bash)
- Linux (Bash)

## Best Practices

1. **Always use the npm/pnpm scripts** rather than calling Node directly
2. **Don't commit `.emulator-ports.json`** (it's dynamic)
3. **Restart Vite dev server** after `.env` changes
4. **Use `emulators:start`** for most development work
5. **Use `emulators:sync:watch`** when actively changing ports

## Related Documentation

- [Emulator Port Sync System](../docs/EMULATOR-PORT-SYNC.md) - Detailed documentation
- [Quick Start Guide](../QUICK-START-EMULATORS.md) - Getting started
- [Firebase Documentation](https://firebase.google.com/docs/emulator-suite) - Official docs

## Support

If scripts aren't working:

1. Check Node.js version: `node --version` (>= 22.0.0)
2. Check pnpm version: `pnpm --version` (>= 9.0.0)
3. Verify Firebase CLI: `firebase --version`
4. Read error messages carefully (they're designed to be helpful!)
5. Check the detailed documentation in `docs/EMULATOR-PORT-SYNC.md`

## Contributing

When adding or modifying scripts:

- ✅ Add JSDoc comments
- ✅ Include help text (--help flag)
- ✅ Use colored output for better UX
- ✅ Test on multiple platforms
- ✅ Update this README
- ✅ Handle errors gracefully
- ✅ Provide clear error messages

