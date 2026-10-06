#!/usr/bin/env node
// Bump the version in package.json — the single source of truth.
//
//   node scripts/bump-version.mjs 0.3.0
//
// flake.nix reads the version from package.json directly, and
// android/app/build.gradle derives versionName/versionCode from it too, so
// updating this one file keeps the web app, the Nix package and the APK in step.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const next = process.argv[2];

if (!next) {
  console.error('usage: bump-version.mjs <version>   e.g. bump-version.mjs 0.3.0');
  process.exit(1);
}

const parsed = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(next);
if (!parsed) {
  console.error(`not a valid semver version: ${next}`);
  process.exit(1);
}
const [, major, minor, patch] = parsed;
const versionCode = Number(major) * 10000 + Number(minor) * 100 + Number(patch);

const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const previous = pkg.version;
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`package.json          ${previous} -> ${next}`);
console.log(`android versionCode   ${versionCode} (derived by android/app/build.gradle)`);

console.log(`\nversion ${next}; next: just release ${next}`);
