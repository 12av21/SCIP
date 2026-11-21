// SCIP E2E Test Runner - Runs Playwright tests with isolated test database
// Usage: NODE_ENV=test SCIP_TEST_DB_PATH=tmp/test_e2e.db SCIP_SERVE_DIST=1 tsx scripts/e2e-test.mts
// This runner implements safe process ownership, dynamic port allocation, and database preflight protection.

import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../src/server/app.js';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const E2E_DIR = path.join(PROJECT_ROOT, 'e2e');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const TEST_DB_PATH = 'tmp/test_e2e.db';
const HEALTH_CHECK_ENDPOINT = '/api/health';
const HEALTH_CHECK_TIMEOUT_MS = 30000;
const HEALTH_CHECK_INTERVAL_MS = 500;

// Process ownership tracking
interface OwnedProcess {
  pid: number;
  description: string;
  port?: number;
}

const ownedProcesses: OwnedProcess[] = [];

function log(msg: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [E2E Runner] ${msg}`);
}

function registerOwnedProcess(process: ChildProcess, description: string, port?: number): void {
  if (process.pid) {
    ownedProcesses.push({ pid: process.pid, description, port });
    log(`Registered owned process: PID ${process.pid} (${description}${port ? `, port ${port}` : ''})`);
  }
}

function unregisterOwnedProcess(pid: number): void {
  const idx = ownedProcesses.findIndex(p => p.pid === pid);
  if (idx !== -1) {
    const p = ownedProcesses[idx];
    ownedProcesses.splice(idx, 1);
    log(`Unregistered owned process: PID ${p.pid} (${p.description})`);
  }
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

/**
 * Database preflight protection - verifies isolation before starting any test server
 */
async function verifyDatabaseIsolation(testDbPath: string): Promise<void> {
  const testDbFullPath = path.resolve(PROJECT_ROOT, testDbPath);
  const primaryDbPath = path.resolve(PROJECT_ROOT, '.scip_database.json');
  
  log(`Resolved test database: ${testDbFullPath}`);
  log(`Resolved primary database: ${primaryDbPath}`);
  
  // 1. Verify paths are different
  if (testDbFullPath === primaryDbPath) {
    throw new Error('FATAL: Test database path resolves to primary database!');
  }
  
  // 2. Verify test environment is active
  if (process.env.NODE_ENV !== 'test' && process.env.SCIP_FORCE_TEST_DB !== '1') {
    throw new Error('FATAL: Test mode requires NODE_ENV=test or SCIP_FORCE_TEST_DB=1');
  }
  
  // 3. Verify explicit test database path is set
  if (!process.env.SCIP_TEST_DB_PATH && !process.env.SCIP_DB_PATH) {
    throw new Error('FATAL: Test mode requires SCIP_TEST_DB_PATH or SCIP_DB_PATH to be set for database isolation');
  }
  
  // 4. Verify the resolved test database path matches the explicit env var
  const explicitTestDbPath = process.env.SCIP_TEST_DB_PATH || process.env.SCIP_DB_PATH || '';
  const explicitResolved = path.resolve(PROJECT_ROOT, explicitTestDbPath);
  if (explicitResolved !== testDbFullPath) {
    throw new Error(`FATAL: Test database path mismatch. Env var resolves to ${explicitResolved}, but test runner uses ${testDbFullPath}`);
  }
  
  // 5. Verify test database file does not equal primary database filename
  if (path.basename(testDbFullPath) === '.scip_database.json') {
    throw new Error('FATAL: Test database filename matches primary database filename');
  }
  
  log('✓ Database preflight checks passed: isolation verified');
}

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from a preferred port
 */
async function findAvailablePort(preferredPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${preferredPort}`);
}

/**
 * Start the test server with dynamic port allocation
 */
async function startTestServer(testDbPath: string): Promise<{ server: ReturnType<typeof http.createServer>; port: number; process: ChildProcess | null }> {
  log('Starting test server with dynamic port allocation...');
  
  // Create the Express app with test configuration
  const app = await createApp({ 
    initMongo: false, 
    attachFrontend: process.env.SCIP_SERVE_DIST === '1' 
  });
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Find available port (prefer 3001 for test, fallback to dynamic)
  const preferredPort = parseInt(process.env.PORT || '3001', 10);
  const port = await findAvailablePort(preferredPort);
  
  log(`Binding test server to port ${port}`);
  
  // Start listening
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
    server.listen(port, '127.0.0.1');
  });
  
  log(`Test server listening on http://127.0.0.1:${port}`);
  
  // We don't spawn a separate process here - the server runs in-process
  // This gives us full ownership and control
  return { server, port, process: null };
}

/**
 * Wait for server health endpoint
 */
async function waitForServerReady(port: number): Promise<void> {
  log(`Waiting for server to be ready at http://127.0.0.1:${port}${HEALTH_CHECK_ENDPOINT}...`);
  const startTime = Date.now();
  let attempt = 0;
  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT_MS) {
    attempt++;
    try {
      log(`[DEBUG] Health check attempt ${attempt}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`http://127.0.0.1:${port}${HEALTH_CHECK_ENDPOINT}`, { 
        method: 'GET', 
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      log(`[DEBUG] Health check response: status=${response.status}, ok=${response.ok}`);
      if (response.ok) { 
        const data = await response.json(); 
        log(`[DEBUG] Health check data: ${JSON.stringify(data)}`);
        if (data.status === 'healthy') { 
          log('Server health check passed'); 
          return; 
        } 
      }
    } catch (e) {
      log(`[DEBUG] Health check error: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  throw new Error(`Server did not become ready within ${HEALTH_CHECK_TIMEOUT_MS}ms`);
}

/**
 * Run Playwright tests with dynamic baseURL
 */
async function runPlaywrightTests(port: number): Promise<number> {
  log(`Running Playwright E2E tests against http://127.0.0.1:${port}...`);
  
  // Generate temporary Playwright config with dynamic baseURL
  const tempConfigPath = path.join(E2E_DIR, 'playwright.config.generated.ts');
  const configContent = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:${port}',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  reporter: [['line']],
});`;
  
  fs.writeFileSync(tempConfigPath, configContent, 'utf-8');
  log(`Generated temporary Playwright config: ${tempConfigPath}`);
  
  return new Promise((resolve) => {
    const playwright = spawn('npx', ['playwright', 'test', '--config', 'playwright.config.generated.ts'], { 
      cwd: E2E_DIR, 
      stdio: 'inherit', 
      shell: true 
    });
    playwright.on('close', (code) => { 
      // Cleanup generated config
      try { fs.unlinkSync(tempConfigPath); } catch {}
      resolve(code ?? 1); 
    });
    playwright.on('error', (err) => { 
      log('Playwright process error: ' + err.message); 
      try { fs.unlinkSync(tempConfigPath); } catch {}
      resolve(1); 
    });
  });
}

/**
 * Gracefully shutdown the test server
 */
async function shutdownTestServer(server: ReturnType<typeof http.createServer>): Promise<void> {
  log('Shutting down test server...');
  return new Promise((resolve) => {
    const forceKillTimeout = setTimeout(() => { 
      log('Server did not shut down gracefully, forcing close...'); 
      server.closeAllConnections?.();
      server.close(() => resolve()); 
    }, 5000);
    server.close(() => { 
      clearTimeout(forceKillTimeout); 
      log('Server shut down gracefully'); 
      resolve(); 
    });
  });
}

/**
 * Verify owned processes have exited
 */
async function verifyOwnedProcessesExited(): Promise<void> {
  log('Verifying owned processes have exited...');
  
  if (ownedProcesses.length === 0) {
    log('No owned processes to verify');
    return;
  }
  
  return new Promise((resolve) => {
    const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq node.exe'], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    let output = '';
    tasklist.stdout?.on('data', (data) => { output += data.toString(); });
    tasklist.on('close', () => {
      const stillRunning: number[] = [];
      for (const owned of ownedProcesses) {
        if (output.includes(` ${owned.pid} `) || output.includes(` ${owned.pid}\r`) || output.includes(` ${owned.pid}\n`)) {
          stillRunning.push(owned.pid);
        }
      }
      if (stillRunning.length > 0) {
        log(`WARNING: Owned processes still running: ${stillRunning.join(', ')}`);
        console.log(output);
      } else {
        log('All owned processes have exited');
      }
      resolve();
    });
  });
}

async function main(): Promise<void> {
  log('=== SCIP E2E Test Runner Starting (Phase 2.2 - Safe Process Ownership) ===');
  
  // Set required environment variables for test isolation
  process.env.NODE_ENV = 'test';
  process.env.SCIP_TEST_DB_PATH = TEST_DB_PATH;
  process.env.SCIP_FORCE_TEST_DB = '1';
  process.env.SCIP_SERVE_DIST = '1';
  process.env.DISABLE_RATE_LIMIT = 'true';
  process.env.DISABLE_HMR = 'true';
  
  let testServer: ReturnType<typeof http.createServer> | null = null;
  let serverPort: number | null = null;
  
  try {
    // 1. Build frontend if needed
    if (!checkDistExists()) { 
      log('dist/ not found, building frontend...'); 
      await buildFrontend(); 
    } else { 
      log('dist/ found, skipping build'); 
    }
    
    // 2. Database preflight protection
    await verifyDatabaseIsolation(TEST_DB_PATH);
    
    // 3. Start test server with dynamic port
    const { server, port } = await startTestServer(TEST_DB_PATH);
    testServer = server;
    serverPort = port;
    
    // 4. Wait for server readiness
    await waitForServerReady(port);
    
    // 5. Run Playwright tests
    const exitCode = await runPlaywrightTests(port);
    
    // 6. Shutdown server
    await shutdownTestServer(server);
    testServer = null;
    
    // 7. Verify owned processes exited
    await verifyOwnedProcessesExited();
    
    if (exitCode === 0) { 
      log('=== ALL E2E TESTS PASSED ==='); 
      process.exit(0); 
    } else { 
      log('=== E2E TESTS FAILED ==='); 
      process.exit(exitCode); 
    }
  } catch (err: unknown) { 
    const message = err instanceof Error ? err.message : String(err);
    log('FATAL ERROR: ' + message); 
    if (testServer) { 
      await shutdownTestServer(testServer); 
    }
    process.exit(1); 
  }
}

main();
