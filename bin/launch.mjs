#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from './server.mjs';
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('BIM Diff benchmark\nUsage: bim-diff [--headless]\nRequires Node.js 22+. Opens a dedicated Chromium; Ctrl+C stops it.\nReports: ~/Downloads/bim-diff-reports. Servers: loopback ports 4176/4177.');
  process.exit(0);
}
if (args.includes('--version')) { console.log('1.0.1'); process.exit(0); }
if (Number(process.versions.node.split('.')[0]) < 22) { console.error('Install Node.js 22 or newer: https://nodejs.org/'); process.exit(1); }
if (args.some(a => a !== '--headless')) { console.error('Unknown option. Use --help.'); process.exit(1); }
const { chromium } = await import('playwright');
if (!existsSync(chromium.executablePath())) {
  console.log('First launch: downloading Chromium. Later launches reuse the cached browser.');
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('playwright/package.json')), 'cli.js');
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', resolve);
  });
  if (code !== 0) { console.error('Chromium installation failed. Check network access and available disk space.'); process.exit(1); }
}
const server = createServer();
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4176, '127.0.0.1', resolve); });
  console.log('Benchmark: http://127.0.0.1:4176 — keep this terminal open.');
  process.argv.push('--browser');
  await import('./telemetry-server.mjs');
} catch (error) {
  console.error('Unable to start benchmark:', error.message);
  console.error('Close another benchmark using ports 4176/4177 and retry. Linux may require Chromium system libraries.');
  server.close(); process.exit(1);
}
