import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' };
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' blob: http://127.0.0.1:4177; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (!['127.0.0.1:4176', 'localhost:4176'].includes(req.headers.host)) { res.writeHead(403); res.end(); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(resolve(root) + sep) || !(await stat(file)).isFile()) throw Error();
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
