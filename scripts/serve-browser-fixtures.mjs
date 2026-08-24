import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { buildBrowserFixtures } from './build-browser-fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.example-dist');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.map', 'application/json; charset=utf-8'],
]);

await buildBrowserFixtures();

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      'allow': 'GET, HEAD',
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end('Method not allowed');
    return;
  }
  try {
    const raw = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const decoded = decodeURIComponent(raw);
    if (decoded.split('/').includes('..')) throw new Error('invalid path');
    const requested = decoded === '/' ? '/index.html' : decoded.endsWith('/') ? `${decoded}index.html` : decoded;
    const file = resolve(output, `.${requested}`);
    const path = relative(output, file);
    if (path.startsWith('..') || isAbsolute(path)) throw new Error('invalid path');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': contentTypes.get(extname(file)) ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

const close = () => server.close(() => process.exit(0));
process.once('SIGINT', close);
process.once('SIGTERM', close);
server.listen(4175, '127.0.0.1');
