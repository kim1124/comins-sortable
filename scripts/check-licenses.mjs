import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const FAILURE = 'license-check: failed\n';
const DEPENDENCY_FILES = new Set([
  '.gitmodules',
  'bower.json',
  'build.gradle',
  'build.gradle.kts',
  'bun.lock',
  'bun.lockb',
  'cargo.lock',
  'cargo.toml',
  'composer.json',
  'composer.lock',
  'deno.json',
  'deno.jsonc',
  'deno.lock',
  'gemfile',
  'gemfile.lock',
  'gradle.lockfile',
  'go.mod',
  'go.sum',
  'go.work',
  'go.work.sum',
  'mix.exs',
  'mix.lock',
  'npm-shrinkwrap.json',
  'package.resolved',
  'package.swift',
  'package-lock.json',
  'package.json',
  'packages.config',
  'pipfile',
  'pipfile.lock',
  'pnpm-lock.yaml',
  'pom.xml',
  'poetry.lock',
  'pubspec.lock',
  'pubspec.yaml',
  'pyproject.toml',
  'settings.gradle',
  'settings.gradle.kts',
  'uv.lock',
  'vcpkg.json',
  'yarn.lock',
]);
const COPIED_OR_GENERATED_SEGMENTS = new Set([
  'build',
  'dist',
  'generated',
  'third-party',
  'third_party',
  'thirdparty',
  'vendor',
  'vendored',
  'vendors',
]);
const ASSET_SEGMENTS = new Set([
  'asset',
  'assets',
  'data',
  'font',
  'fonts',
  'icon',
  'icons',
  'image',
  'images',
  'media',
  'public',
  'static',
  'wasm',
]);
const THIRD_PARTY_NAME = /(?:^|[._-])(?:third[._-]?party|vendor(?:ed|s)?)(?:[._-]|$)/i;
const DATA_ASSET_NAME = /^(?:data|dataset|metadata)(?:[._-].*)?\.(?:csv|json|jsonl|ndjson|parquet)$/i;
const ASSET_EXTENSION = /\.(?:a|apk|avif|bin|bmp|class|deb|dll|dylib|eot|exe|gif|gz|ico|jar|jpe?g|lib|mp3|mp4|node|o|ogg|otf|pdf|png|rpm|so(?:\.\d+)*|svg|tar|tgz|ttf|wav|wasm|webm|webp|whl|woff2?|zip)$/i;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length
    && actual.every((key, index) => key === required[index]);
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function parseScope(root) {
  const scope = JSON.parse(readFileSync(join(root, 'LICENSE_SCOPE.json'), 'utf8'));
  if (!hasExactKeys(scope, ['schemaVersion', 'packageBoundary', 'trackedMaterial'])) {
    throw new Error('invalid scope');
  }
  if (scope.schemaVersion !== 1 || scope.packageBoundary !== false) {
    throw new Error('invalid boundary');
  }
  if (!hasExactKeys(scope.trackedMaterial, [
    'assets',
    'copiedOrGeneratedCode',
    'dependencies',
  ])) {
    throw new Error('invalid material');
  }
  if (!isEmptyArray(scope.trackedMaterial.dependencies)
    || !isEmptyArray(scope.trackedMaterial.copiedOrGeneratedCode)
    || !isEmptyArray(scope.trackedMaterial.assets)) {
    throw new Error('evidence review required');
  }
}

function trackedPaths(root) {
  const output = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output.split('\0').filter(Boolean);
}

function isDependency(path) {
  const name = basename(path).toLowerCase();
  return DEPENDENCY_FILES.has(name)
    || /^requirements(?:[-_.][a-z0-9-]+)?\.txt$/i.test(name);
}

function isCopiedOrGenerated(path) {
  const segments = path.toLowerCase().split('/');
  const name = segments.at(-1);
  return segments.some((segment) => COPIED_OR_GENERATED_SEGMENTS.has(segment))
    || THIRD_PARTY_NAME.test(name)
    || /(?:^|[._-])(?:generated|min)(?:[._-]|$)/i.test(name)
    || /\.map$/i.test(name);
}

function isAsset(path) {
  const segments = path.toLowerCase().split('/');
  const name = segments.at(-1);
  return segments.some((segment) => ASSET_SEGMENTS.has(segment))
    || DATA_ASSET_NAME.test(name)
    || ASSET_EXTENSION.test(path);
}

try {
  if (process.argv.length !== 2) throw new Error('invalid arguments');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (root === '') throw new Error('missing root');
  parseScope(root);
  const paths = trackedPaths(root);
  if (paths.some((path) => isDependency(path) || isCopiedOrGenerated(path) || isAsset(path))) {
    throw new Error('tracked material requires review');
  }
} catch {
  process.stderr.write(FAILURE);
  process.exitCode = 1;
}
