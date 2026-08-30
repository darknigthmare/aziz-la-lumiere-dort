import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml' };

createServer(async (req,res) => {
  try {
    const raw = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const safe = normalize(raw).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, safe === '/' ? 'index.html' : safe.slice(1));
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Introuvable');
  }
}).listen(port, () => console.log(`AZIZ v1.2.0 — http://localhost:${port}`));
