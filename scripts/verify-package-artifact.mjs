import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const FAILURE = 'package-artifact-check: failed\n';
const licenseChecker = fileURLToPath(new URL('./check-licenses.mjs', import.meta.url));

function normalize(value) {
  const path = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!path || isAbsolute(path) || path.split('/').includes('..') || /[*?[\]]/.test(path)) {
    throw new Error('invalid path');
  }
  return path;
}

function covered(path, roots) {
  return path === 'package.json'
    || /^licen[cs]e(?:\.[a-z0-9]+)?$/i.test(path)
    || roots.some((root) => path === root || path.startsWith(`${root}/`));
}

function exportPaths(manifest) {
  const paths = [];
  for (const target of Object.values(manifest.exports ?? {})) {
    if (typeof target === 'string') {
      paths.push(normalize(target));
      continue;
    }
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      throw new Error('invalid export');
    }
    for (const value of Object.values(target)) {
      if (typeof value !== 'string') throw new Error('invalid export target');
      paths.push(normalize(value));
    }
  }
  return paths;
}

try {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('missing files');
  }
  const roots = manifest.files.map((entry) => normalize(entry));
  const packed = JSON.parse(execFileSync(
    'npm',
    ['pack', '--json', '--ignore-scripts'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ));
  if (!Array.isArray(packed) || packed.length !== 1) throw new Error('invalid pack');

  const [{ filename, files }] = packed;
  if (typeof filename !== 'string'
    || basename(filename) !== filename
    || !/^[a-z0-9._-]+\.tgz$/i.test(filename)) {
    throw new Error('invalid artifact');
  }
  if (!Array.isArray(files) || files.length === 0) throw new Error('missing artifact files');

  const paths = files.map((entry) => normalize(entry?.path ?? ''));
  if (!paths.every((path) => covered(path, roots))) throw new Error('unexpected artifact file');
  if (!roots.every((root) => paths.some((path) => path === root || path.startsWith(`${root}/`)))) {
    throw new Error('missing allow-list root');
  }
  if (!exportPaths(manifest).every((path) => paths.includes(path))) {
    throw new Error('missing public export');
  }
  if (!paths.includes('LICENSE')) throw new Error('missing license');

  execFileSync(process.execPath, [licenseChecker, '--artifact', filename], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.stdout.write(`${filename}\n`);
} catch {
  process.stderr.write(FAILURE);
  process.exitCode = 1;
}
