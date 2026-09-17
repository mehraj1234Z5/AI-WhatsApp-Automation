/**
 * Concurrent Development Launcher for AI WhatsApp Automation System
 * Starts Backend Express server and Frontend Vite development server
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('  Starting AI WhatsApp Automation System (Dev Mode)');
console.log('========================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const nodeCmd = 'node';

// 1. Start Backend Server
const backend = spawn(nodeCmd, ['backend/server.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
});

// 2. Start Frontend Vite Server
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../frontend'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n[Shutdown] Stopping backend and frontend processes...');
  try {
    if (backend && !backend.killed) backend.kill();
    if (frontend && !frontend.killed) frontend.kill();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
