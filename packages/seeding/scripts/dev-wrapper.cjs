const { spawnSync } = require('child_process');
const path = require('path');

// Opt-in via ENABLE_SEEDING_DEV=1 to run the seeding dev pipeline
const enabled = process.env.ENABLE_SEEDING_DEV === '1' || process.env.SEEDING_DEV === '1';

if (!enabled) {
  console.log('[seeding] dev task is disabled by default.');
  console.log('[seeding] To enable, set ENABLE_SEEDING_DEV=1 and re-run.');
  process.exit(0);
}

// Resolve tsx binary from local node_modules
const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const script = path.join(__dirname, '..', 'src', 'index.ts');

console.log('[seeding] Starting dev pipeline via tsx...');
const result = spawnSync(tsxBin, [script], { stdio: 'inherit' });

process.exit(result.status ?? 1);