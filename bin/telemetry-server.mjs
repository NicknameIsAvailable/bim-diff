/** Optional loopback-only OS/CDP collector; no privileged commands or external upload. */
import http from 'node:http';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import { join, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
const exec = promisify(execFile);
const command = async (file, args) => (await exec(file, args, { timeout: 2000, maxBuffer: 8 * 1024 * 1024 })).stdout;
const m = (value, unit, reason) => ({ value: Number.isFinite(value) ? value : null, unit, reason });
const cpu = () => os.cpus().reduce((s, c) => { for (const [k, v] of Object.entries(c.times)) { s.total += v; if (k === 'idle') s.idle += v; } return s; }, { total: 0, idle: 0 });
let previousCpu = cpu(), previousTime = performance.now(), previousProcesses = new Map(), previousTask;
export let browser;
let browserCdp, pageCdp;
const token = randomUUID();
const systemScope = 'Whole system, includes other applications; sampled approximately once per second';
async function collect() {
  const now = performance.now(), seconds = (now - previousTime) / 1000; previousTime = now;
  const current = cpu(), delta = current.total - previousCpu.total;
  const metrics = {
    systemCpu: m(delta > 0 ? 100 * (1 - (current.idle - previousCpu.idle) / delta) : null, '%', systemScope),
    systemRamUsed: m(os.totalmem() - os.freemem(), 'bytes', 'OS total minus free, includes filesystem cache; not application RAM'),
    systemRamTotal: m(os.totalmem(), 'bytes', 'Physical system RAM'),
    systemGpu: m(null, '%', 'No supported GPU utilization provider'),
    systemGpuMemory: m(null, 'bytes', 'No supported GPU memory provider'),
    browserCpu: m(null, '%', 'Requires collector --browser and its opened tab; CPU sums all managed browser processes, 100% = one logical core'),
    browserRss: m(null, 'bytes', 'Requires collector --browser; RSS sums processes and may double count shared pages'),
    rendererTaskBusy: m(null, '%', 'Requires collector --browser; CDP TaskDuration wall-time occupancy, not CPU utilization'),
  };
  previousCpu = current;
  const details = { platform: os.platform(), cpuModel: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemory: os.totalmem(), intervalSeconds: seconds };
  if (process.platform === 'darwin') {
    try {
      const output = await command('/usr/sbin/ioreg', ['-r', '-c', 'IOAccelerator', '-l']);
      const stats = [...output.matchAll(/"PerformanceStatistics" = (.+)/g)].map(match => Object.fromEntries([...match[1].matchAll(/"([^"]+)"=(-?\d+)/g)].map(x => [x[1], Number(x[2])])));
      details.gpu = stats;
      const loads = stats.map(s => s['Device Utilization %']).filter(Number.isFinite);
      const memory = stats.map(s => s['In use system memory']).filter(Number.isFinite);
      metrics.systemGpu = m(loads.length ? Math.max(...loads) : null, '%', 'macOS IOAccelerator Device Utilization %, maximum across reported GPUs; whole system, driver-dependent');
      metrics.systemGpuMemory = m(memory.length ? memory.reduce((a, b) => a + b, 0) : null, 'bytes', 'macOS IOAccelerator In use system memory, whole GPU driver, not model VRAM');
    } catch (e) { details.gpuError = String(e); }
  } else {
    try {
      const output = await command('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw', '--format=csv,noheader,nounits']);
      const rows = output.trim().split('\n').map(line => line.split(',').map(x => Number(x.trim())));
      details.gpu = rows.map(([utilization, memoryMiB, temperatureC, powerWatts]) => ({ utilization, memoryMiB, temperatureC, powerWatts }));
      const loads = rows.map(r => r[0]).filter(Number.isFinite), memory = rows.map(r => r[1]).filter(Number.isFinite);
      metrics.systemGpu = m(loads.length ? Math.max(...loads) : null, '%', 'nvidia-smi whole-device utilization; maximum across GPUs');
      metrics.systemGpuMemory = m(memory.length ? memory.reduce((a, b) => a + b, 0) * 1048576 : null, 'bytes', 'nvidia-smi whole-device memory, sum across GPUs');
    } catch { /* Intel/AMD counters are driver-specific, never fabricate utilization. */ }
  }
  if (browserCdp) {
    try {
      const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
      let cpuSeconds = 0; const next = new Map();
      for (const p of processInfo) { const old = previousProcesses.get(p.id); if (old !== undefined && p.cpuTime >= old) cpuSeconds += p.cpuTime - old; next.set(p.id, p.cpuTime); }
      metrics.browserCpu = m(previousProcesses.size && seconds > 0 ? cpuSeconds / seconds * 100 : null, '%', metrics.browserCpu.reason);
      previousProcesses = next; details.processes = processInfo;
      const pids = processInfo.map(p => Number(p.id)).filter(Number.isSafeInteger);
      if (process.platform !== 'win32' && pids.length) {
        const output = await command('ps', ['-o', 'rss=', '-p', pids.join(',')]);
        metrics.browserRss = m(output.trim().split(/\s+/).reduce((a, b) => a + Number(b), 0) * 1024, 'bytes', metrics.browserRss.reason);
      } else if (pids.length) {
        const output = await command('powershell.exe', ['-NoProfile', '-Command', `Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue | ForEach-Object { $_.WorkingSet64 }`]);
        metrics.browserRss = m(output.trim().split(/\s+/).reduce((a, b) => a + Number(b), 0), 'bytes', metrics.browserRss.reason);
      }
      if (pageCdp) {
        const { metrics: cdp } = await pageCdp.send('Performance.getMetrics'); details.cdp = Object.fromEntries(cdp.map(x => [x.name, x.value]));
        const task = details.cdp.TaskDuration;
        metrics.rendererTaskBusy = m(previousTask !== undefined && seconds > 0 ? (task - previousTask) / seconds * 100 : null, '%', metrics.rendererTaskBusy.reason); previousTask = task;
      }
    } catch (e) { details.browserError = String(e); }
  }
  details.collectorDurationMs = performance.now() - now;
  return { sampledAt: new Date().toISOString(), metrics, details };
}
let sample = { metrics: {}, details: {} }, busy = false;
async function update() { if (busy) return; busy = true; try { sample = await collect(); } catch (e) { console.error(String(e)); } finally { busy = false; } }
await update(); const interval = setInterval(update, 1000);
const server = http.createServer((req, res) => {
  if (!['127.0.0.1:4177', 'localhost:4177'].includes(req.headers.host)) { res.writeHead(403); res.end(); return; }
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):4176$/.test(origin)) { res.writeHead(403); res.end(); return; }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  const url = new URL(req.url ?? '/', 'http://127.0.0.1:4177');
  if (req.method !== 'GET' || url.pathname !== '/sample') { res.writeHead(404); res.end(); return; }
  const result = structuredClone(sample);
  if (url.searchParams.get('token') !== token) {
    for (const name of ['browserCpu', 'browserRss', 'rendererTaskBusy']) result.metrics[name] = m(null, name === 'browserRss' ? 'bytes' : '%', 'Open the dedicated browser with collector --browser to attribute these metrics');
    delete result.details.processes; delete result.details.cdp;
  }
  res.end(JSON.stringify(result));
});
server.on('error', error => { console.error(String(error)); process.exit(1); });
server.listen(4177, '127.0.0.1', () => console.log('Local telemetry: http://127.0.0.1:4177/sample'));
if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: process.argv.includes('--headless'), args: ['--enable-precise-memory-info', ...(process.argv.includes('--headless') ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : [])] });
  browserCdp = await browser.newBrowserCDPSession();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, acceptDownloads: true });
  pageCdp = await page.context().newCDPSession(page); await pageCdp.send('Performance.enable');
  await page.goto(`http://127.0.0.1:4176/?telemetry=${token}`);
  page.on('download', async download => { const directory = join(os.homedir(), 'Downloads', 'bim-diff-reports'); mkdirSync(directory, { recursive: true }); const path = join(directory, `${Date.now()}-${basename(download.suggestedFilename())}`); await download.saveAs(path); console.log(`Report saved: ${path}`); });
  browser.on('disconnected', () => { void close(); });
  console.log('Dedicated benchmark Chromium opened; browser CPU/RSS and CDP counters are attributed to this browser only.');
}
export async function stopCollector() { clearInterval(interval); server.close(); await browser?.close(); }
async function close() { await stopCollector(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
