import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp' };
const publicFiles = new Set(['/','/index.html','/sw.js','/manifest.webmanifest']);
const publicPrefixes = ['/src/','/assets/'];

createServer(async (req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method || 'GET')) throw new Error('method');
    const raw = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (raw.includes('\\') || raw.includes('\0') || raw.split('/').some(segment => segment === '..' || segment === '.')) throw new Error('unsafe path');
    const canonical = raw === '/' ? '/' : `/${raw.split('/').filter(Boolean).join('/')}`;
    if (!publicFiles.has(canonical) && !publicPrefixes.some(prefix => canonical.startsWith(prefix))) throw new Error('private path');
    const relative = canonical === '/' ? 'index.html' : canonical.slice(1);
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(`${root.endsWith(sep) ? root : root + sep}`)) throw new Error('escaped root');
    if ((await stat(file)).isDirectory()) throw new Error('directory');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type':types[extname(file)] || 'application/octet-stream',
      'Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600',
      'X-Content-Type-Options':'nosniff',
      'X-Frame-Options':'DENY',
      'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Introuvable');
  }
}).listen(port, '127.0.0.1', () => console.log(`AZIZ v1.2.0 — http://localhost:${port}`));
