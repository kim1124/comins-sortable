import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';

import { peerRanges } from '../package-boundary.mjs';

const FAILURE = 'license-check: failed\n';
const ROUTINE_LICENSES = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
]);
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
const REVIEWED_DEPENDENCY_FILES = new Set(['package.json', 'package-lock.json']);
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
const SAFE_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;
const SAFE_LICENSE = /^(?:UNKNOWN|[A-Za-z0-9.+()-]+(?: (?:AND|OR|WITH) [A-Za-z0-9.+()-]+)*)$/;
const EXACT_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SURFACES = new Set(['development', 'optional', 'peer', 'runtime']);

class ReviewRequired extends Error {
  constructor(name, license, surface) {
    super('license review required');
    this.name = name;
    this.license = license;
    this.surface = surface;
  }
}

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

function isSafeRelativePath(value, directory = false) {
  if (typeof value !== 'string' || value === '') return false;
  const normalized = value.replaceAll('\\', '/');
  if (isAbsolute(normalized)
    || normalized.startsWith('/')
    || normalized.split('/').includes('..')) {
    return false;
  }
  return directory
    ? normalized.endsWith('/') && normalized.length > 1
    : !normalized.endsWith('/');
}

function sameJson(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameJson(value, right[index]));
  }
  if (isObject(left) || isObject(right)) {
    if (!isObject(left) || !isObject(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => (
        key === rightKeys[index] && sameJson(left[key], right[key])
      ));
  }
  return Object.is(left, right);
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function optionalPeerMeta() {
  return Object.fromEntries(
    Object.keys(peerRanges).map((name) => [name, { optional: true }]),
  );
}

function validatePublicManifest(manifest) {
  if (!isObject(manifest)
    || manifest.name !== 'comins-sortable'
    || typeof manifest.version !== 'string'
    || !EXACT_SEMVER.test(manifest.version)
    || Object.hasOwn(manifest, 'private')
    || manifest.type !== 'module'
    || manifest.license !== 'MIT'
    || !hasExactKeys(manifest.publishConfig, ['access'])
    || manifest.publishConfig.access !== 'public'
    || Object.hasOwn(manifest, 'dependencies')
    || !sameJson(manifest.peerDependencies, peerRanges)
    || !sameJson(manifest.peerDependenciesMeta, optionalPeerMeta())) {
    throw new Error('invalid manifest');
  }
}

function parseScope(root) {
  const scope = readJson(root, 'LICENSE_SCOPE.json');
  if (!hasExactKeys(scope, [
    'schemaVersion',
    'packageBoundary',
    'runtimeDependencies',
    'peerDependencies',
    'trackedMaterial',
  ])) throw new Error('invalid scope');
  if (scope.schemaVersion !== 2 || scope.packageBoundary !== true) {
    throw new Error('invalid boundary');
  }
  if (!isEmptyArray(scope.runtimeDependencies)
    || !sameJson(scope.peerDependencies, peerRanges)) {
    throw new Error('invalid dependency scope');
  }
  if (!hasExactKeys(scope.trackedMaterial, ['assets', 'copiedOrGeneratedCode'])
    || !isEmptyArray(scope.trackedMaterial.copiedOrGeneratedCode)
    || !Array.isArray(scope.trackedMaterial.assets)) {
    throw new Error('evidence review required');
  }
  const reviewedAssets = scope.trackedMaterial.assets;
  const reviewedPaths = new Set();
  for (const asset of reviewedAssets) {
    if (!hasExactKeys(asset, [
      'generated',
      'license',
      'modifications',
      'origin',
      'path',
      'source',
      'useSurface',
    ])
      || !isSafeRelativePath(asset.path)
      || !isSafeRelativePath(asset.source, true)
      || asset.origin !== 'first-party'
      || asset.license !== 'MIT'
      || asset.useSurface !== 'repository-documentation'
      || asset.generated !== true
      || !sameJson(asset.modifications, ['resized', 'gif-encoded'])
      || reviewedPaths.has(asset.path)) {
      throw new Error('evidence review required');
    }
    reviewedPaths.add(asset.path);
  }
  return reviewedAssets;
}

function parsePackageBoundary(root) {
  const manifest = readJson(root, 'package.json');
  const lock = readJson(root, 'package-lock.json');
  const lockRoot = lock.packages?.[''];

  if (!isObject(lock) || !isObject(lock.packages)
    || !isObject(lockRoot)) throw new Error('invalid package boundary');
  validatePublicManifest(manifest);
  if (lock.lockfileVersion !== 3
    || lock.name !== manifest.name
    || lock.version !== manifest.version
    || lockRoot.name !== manifest.name
    || lockRoot.version !== manifest.version
    || Object.hasOwn(lockRoot, 'dependencies')
    || !sameJson(lockRoot.peerDependencies, peerRanges)
    || !sameJson(lockRoot.peerDependenciesMeta, optionalPeerMeta())) {
    throw new Error('invalid lock root');
  }

  return lock.packages;
}

function readPackedFile(filename, path) {
  return execFileSync('tar', ['-xOzf', filename, `package/${path}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function checkArtifact(root, filename) {
  if (typeof filename !== 'string'
    || basename(filename) !== filename
    || !/^[a-z0-9._-]+\.tgz$/i.test(filename)) {
    throw new Error('invalid artifact');
  }
  const sourceManifest = readJson(root, 'package.json');
  const packedManifest = JSON.parse(readPackedFile(filename, 'package.json'));
  validatePublicManifest(sourceManifest);
  validatePublicManifest(packedManifest);
  for (const key of [
    'name',
    'version',
    'license',
    'type',
    'files',
    'sideEffects',
    'exports',
    'peerDependencies',
    'peerDependenciesMeta',
    'publishConfig',
  ]) {
    if (!sameJson(packedManifest[key], sourceManifest[key])) {
      throw new Error('artifact manifest drift');
    }
  }
  if (readPackedFile(filename, 'LICENSE') !== readFileSync(join(root, 'LICENSE'), 'utf8')) {
    throw new Error('license drift');
  }

  const entries = execFileSync('tar', ['-tzf', filename], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\n').filter(Boolean);
  if (entries.length === 0
    || entries.some((entry) => !entry.startsWith('package/') || /(^|\/)node_modules\//.test(entry))) {
    throw new Error('invalid artifact contents');
  }
  for (const entry of entries.filter((path) => /^package\/dist\/.*\.js$/.test(path))) {
    const source = readPackedFile(filename, entry.slice('package/'.length));
    if (/(?:^|\n)\/\/#region node_modules\//.test(source)) {
      throw new Error('bundled third-party source');
    }
  }
  for (const entry of entries.filter((path) => /^package\/dist\/.*\.js\.map$/.test(path))) {
    const sourceMap = JSON.parse(readPackedFile(filename, entry.slice('package/'.length)));
    const sources = Array.isArray(sourceMap.sources) ? sourceMap.sources : [];
    if (sourceMap.sourceRoot !== ''
      || (Array.isArray(sourceMap.sourcesContent)
        && sourceMap.sourcesContent.some((source) => typeof source === 'string' && source !== ''))
      || sources.some((source) => {
        const normalized = String(source).replaceAll('\\', '/');
        return normalized.startsWith('/')
          || /^[A-Za-z]:\//.test(normalized)
          || normalized.startsWith('file:')
          || /(^|\/)node_modules\//.test(normalized);
      })) {
      throw new Error('unsafe source map');
    }
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

function packageName(path) {
  if (path === '') return 'comins-sortable';
  const name = path.split('node_modules/').at(-1);
  if (name === undefined || !SAFE_PACKAGE_NAME.test(name)) {
    throw new Error('invalid package name');
  }
  return name;
}

function useSurface(metadata) {
  if (metadata.dev === true) return 'development';
  if (metadata.peer === true) return 'peer';
  if (metadata.optional === true) return 'optional';
  return 'runtime';
}

function checkLockLicenses(packages) {
  for (const [path, metadata] of Object.entries(packages)) {
    if (!isObject(metadata)) throw new Error('invalid lock package');
    const license = typeof metadata.license === 'string' ? metadata.license : 'UNKNOWN';
    if (ROUTINE_LICENSES.has(license)) continue;
    throw new ReviewRequired(packageName(path), license, useSurface(metadata));
  }
}

function safeReview(error) {
  return error instanceof ReviewRequired
    && SAFE_PACKAGE_NAME.test(error.name)
    && SAFE_LICENSE.test(error.license)
    && error.license.length <= 100
    && SURFACES.has(error.surface);
}

try {
  const args = process.argv.slice(2);
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (root === '') throw new Error('missing root');

  if (args.length === 0) {
    const reviewedAssets = parseScope(root);
    const packages = parsePackageBoundary(root);
    const paths = trackedPaths(root);
    const reviewedAssetPaths = new Set(reviewedAssets.map((asset) => asset.path));
    if (reviewedAssets.some((asset) => (
      !paths.includes(asset.path)
      || !paths.some((path) => path.startsWith(asset.source))
      || !isAsset(asset.path)
    ))) throw new Error('reviewed asset drift');
    if (paths.some((path) => (
      (isDependency(path) && !REVIEWED_DEPENDENCY_FILES.has(path))
      || (isCopiedOrGenerated(path) && !reviewedAssetPaths.has(path))
      || (isAsset(path) && !reviewedAssetPaths.has(path))
    ))) throw new Error('tracked material requires review');
    checkLockLicenses(packages);
  } else if (args.length === 2 && args[0] === '--artifact') {
    checkArtifact(root, args[1]);
  } else {
    throw new Error('invalid arguments');
  }
} catch (error) {
  if (safeReview(error)) {
    process.stderr.write(
      `license-review-required: ${error.name} ${error.license} ${error.surface}\n`,
    );
  } else {
    process.stderr.write(FAILURE);
  }
  process.exitCode = 1;
}
