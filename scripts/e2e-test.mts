// SCIP E2E Test Runner - Runs Playwright tests with isolated test database
// Usage: NODE_ENV=test SCIP_TEST_DB_PATH=tmp/test_e2e.db SCIP_SERVE_DIST=1 tsx scripts/e2e-test.mts

import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const E2E_DIR = path.join(PROJECT_ROOT, 'e2e');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const TEST_DB_PATH = 'tmp/test_e2e.db';
const SERVER_PORT = 3000;
const HEALTH_CHECK_ENDPOINT = '/api/health';
const HEALTH_CHECK_TIMEOUT_MS = 30000;
const HEALTH_CHECK_INTERVAL_MS = 500;

let serverProcess: ChildProcess | null = null;
let serverReady = false;

function log(msg: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [E2E Runner] ${msg}`);
}

function checkDistExists(): boolean {
  return fs.existsSync(path.join(DIST_DIR, 'index.html'));
}

async function buildFrontend(): Promise<void> {
  log('Building frontend...');
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
    });
    buildProcess.on('close', (code) => {
      if (code === 0) { log('Frontend build completed'); resolve(); }
      else { reject(new Error('Frontend build failed with exit code ' + code)); }
    });
  });
}

function startServer(): ChildProcess {
  log('Starting server with NODE_ENV=test, SCIP_TEST_DB_PATH=' + TEST_DB_PATH + ', SCIP_SERVE_DIST=1...');
  const env = { ...process.env, NODE_ENV: 'test', SCIP_TEST_DB_PATH: TEST_DB_PATH, SCIP_SERVE_DIST: '1', SCIP_FORCE_TEST_DB: '1', PORT: String(SERVER_PORT) };
  const server = spawn('npx', ['tsx', 'server.ts'], { cwd: PROJECT_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  server.stdout?.on('data', (data) => { const msg = data.toString().trim(); if (msg) log('[Server] ' + msg); });
  server.stderr?.on('data', (data) => { const msg = data.toString().trim(); if (msg) log('[Server ERROR] ' + msg); });
  server.on('close', (code) => { log('Server process exited with code ' + code); serverProcess = null; });
  server.on('error', (err) => { log('Server process error: ' + err.message); });
  return server;
}

async function waitForServerReady(): Promise<void> {
  log('Waiting for server to be ready at http://localhost:' + SERVER_PORT + HEALTH_CHECK_ENDPOINT + '...');
  const startTime = Date.now();
  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT_MS) {
    try {
      const response = await fetch('http://localhost:' + SERVER_PORT + HEALTH_CHECK_ENDPOINT, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (response.ok) { const data = await response.json(); if (data.success === true) { log('Server health check passed'); serverReady = true; return; } }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  throw new Error('Server did not become ready within ' + HEALTH_CHECK_TIMEOUT_MS + 'ms');
}

async function runPlaywrightTests(): Promise<number> {
  log('Running Playwright E2E tests...');
  return new Promise((resolve) => {
    const playwright = spawn('npx', ['playwright', 'test'], { cwd: E2E_DIR, stdio: 'inherit', shell: true });
    playwright.on('close', (code) => { resolve(code ?? 1); });
    playwright.on('error', (err) => { log('Playwright process error: ' + err.message); resolve(1); });
  });
}

async function shutdownServer(): Promise<void> {
  if (!serverProcess) { log('No server process to shut down'); return; }
  log('Shutting down server...');
  return new Promise((resolve) => {
    if (!serverProcess) { resolve(); return; }
    const forceKillTimeout = setTimeout(() => { log('Server did not shut down gracefully, force killing...'); serverProcess?.kill('SIGKILL'); resolve(); }, 5000);
    serverProcess.on('close', () => { clearTimeout(forceKillTimeout); log('Server shut down gracefully'); resolve(); });
    serverProcess.kill('SIGINT');
  });
}

async function verifyNoLeftoverProcesses(): Promise<void> {
  log('Verifying no leftover Node processes...');
  return new Promise((resolve) => {
    const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq node.exe'], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    let output = '';
    tasklist.stdout?.on('data', (data) => { output += data.toString(); });
    tasklist.on('close', () => { if (output.includes('node.exe')) { log('WARNING: Node processes still running:'); console.log(output); } else { log('No leftover Node processes found'); } resolve(); });
  });
}

async function main(): Promise<void> {
  log('=== SCIP E2E Test Runner Starting ===');
  try {
    if (!checkDistExists()) { log('dist/ not found, building frontend...'); await buildFrontend(); } else { log('dist/ found, skipping build'); }
    const testDbFullPath = path.resolve(PROJECT_ROOT, TEST_DB_PATH);
    const primaryDbPath = path.resolve(PROJECT_ROOT, '.scip_database.json');
    if (testDbFullPath === primaryDbPath) { throw new Error('FATAL: Test database path resolves to primary database!'); }
    log('Test database: ' + testDbFullPath);
    log('Primary database: ' + primaryDbPath);
    log('Preflight check passed: databases are separate');
    serverProcess = startServer();
    await waitForServerReady();
    const exitCode = await runPlaywrightTests();
    await shutdownServer();
    await verifyNoLeftoverProcesses();
    if (exitCode === 0) { log('=== ALL E2E TESTS PASSED ==='); process.exit(0); }
    else { log('=== E2E TESTS FAILED ==='); process.exit(exitCode); }
  } catch (err) { log('FATAL ERROR: ' + err.message); if (serverProcess) { await shutdownServer(); } process.exit(1); }
}
main();
