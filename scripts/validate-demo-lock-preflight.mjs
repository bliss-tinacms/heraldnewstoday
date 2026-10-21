#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const mutation = process.env.DEMO_LOCK_PREFLIGHT_MUTATION || '';
const fixtureRoot = resolve(root, 'tests/fixtures/astro-demo-lock/authoritative');
const manifestPath = resolve(fixtureRoot, 'SHA256SUMS');
const requiredControls = [
  'NO-PREMATURE-COMPLETION', 'AUTHORITY-FIRST', 'GATE-SELF-TEST', 'PRODUCTION-DATA-SHAPE',
  'DESTINATION-ENV-ONLY', 'FRESH-PROCESS-AND-SHUTDOWN', 'SERIAL-BROWSER-GATES',
  'RESOURCE-PREFLIGHT', 'DETERMINISTIC-TOOLCHAIN', 'PUBLISHER-BEFORE-FINAL-SHA',
  'TRUE-ORIGIN-AND-LIVE-PROOF', 'SELF-CONTAINED-RUNTIME-AND-CLEANUP', 'STRUCTURED-EVIDENCE',
  'CHECKPOINT-NOT-COMPLETION', 'MINIMAL-RETRY-DIAGNOSTICS', 'LITERAL-VISUAL-NON-APPROXIMATION',
  'SHA-HTTP-NOT-VISUAL-PROOF', 'CLOUD-SOURCE-PRECEDENCE', 'REAL-WHEEL-STICKY-PROOF',
  'RESPONSIVE-RAIL-TOC-CONTRACT', 'COMPLETE-TEMPLATE-FAMILY-MATRIX', 'FIXTURE-INTEGRITY-FIRST',
  'DUAL-ARTIFACT-SECRET-SCAN', 'EXACT-SHA-PACKAGE-POINTER-PARITY', 'FINAL-POST-CLEANUP-ACCEPTANCE',
];
const missing = [];
const failures = [];
const passes = [];
const startedAt = new Date().toISOString();
const lockPath = resolve(root, 'ASTRO-DEMO-LOCK.md');
const goldPath = resolve(root, 'TINA-MIGRATION-GOLD.md');
const validatorPath = resolve(root, 'scripts/validate-demo-lock.mjs');
const negativePath = resolve(root, 'scripts/test-demo-lock-negative.mjs');
const packagePath = resolve(root, 'package.json');

function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function markRequired(path, code) {
  if (!existsSync(path) || mutation === code) missing.push(code);
  else passes.push(code);
}
function walkFiles(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? walkFiles(child) : [child];
  });
}

markRequired(lockPath, 'lock-document');
markRequired(goldPath, 'gold-document');
markRequired(manifestPath, 'authority-manifest');
markRequired(validatorPath, 'positive-browser-validator');
markRequired(negativePath, 'controlled-negative-suite');

let controlsPresent = 0;
if (existsSync(lockPath)) {
  let lock = readFileSync(lockPath, 'utf8');
  if (mutation === 'missing-control') lock = lock.replace(requiredControls[0], 'REMOVED-CONTROL');
  for (const control of requiredControls) {
    if (!lock.includes(control)) failures.push(`missing-control:${control}`);
    else controlsPresent += 1;
  }
}

let fixtureManifestSha256 = null;
let checkedFixtures = 0;
if (existsSync(manifestPath) && mutation !== 'authority-manifest') {
  fixtureManifestSha256 = sha256(manifestPath);
  const expectedPaths = new Set();
  for (const line of readFileSync(manifestPath, 'utf8').trim().split('\n').filter(Boolean)) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match) { failures.push(`malformed-manifest-line:${line}`); continue; }
    const [, expected, listed] = match;
    const file = resolve(root, listed);
    if (!file.startsWith(`${fixtureRoot}/`)) { failures.push(`fixture-outside-authority:${listed}`); continue; }
    expectedPaths.add(file);
    if (!existsSync(file) || !statSync(file).isFile()) { failures.push(`missing-fixture:${listed}`); continue; }
    if (sha256(file) !== expected) failures.push(`fixture-hash-drift:${listed}`);
    else checkedFixtures += 1;
  }
  for (const file of walkFiles(fixtureRoot)) {
    if (file === manifestPath) continue;
    if (!expectedPaths.has(file)) failures.push(`unmanifested-fixture:${relative(root, file)}`);
  }
  if (expectedPaths.size === 0) failures.push('empty-authority-manifest');
}

let scripts = {};
if (existsSync(packagePath)) {
  try { scripts = JSON.parse(readFileSync(packagePath, 'utf8')).scripts || {}; }
  catch (error) { failures.push(`invalid-package-json:${error.message}`); }
}
for (const command of ['astro:demo-lock', 'astro:demo-lock:negative', 'astro:demo-lock:preflight', 'astro:demo-lock:preflight:negative']) {
  if (!scripts[command]) missing.push(`package-command:${command}`);
}
if (scripts['astro:demo-lock']?.includes('validate-demo-lock-preflight')) failures.push('positive-command-points-only-to-preflight');
if (scripts['astro:demo-lock:negative']?.includes('preflight')) failures.push('negative-command-points-only-to-preflight');

const status = failures.length ? 'FAIL' : missing.length ? 'BLOCKED' : 'PASS';
const evidence = {
  schema: 'astro-demo-lock-preflight-v1', status, root, startedAt,
  completedAt: new Date().toISOString(), controlsPresent, controlsRequired: requiredControls.length,
  fixtureManifestSha256, checkedFixtures, passes, missing, failures,
};
console.log(JSON.stringify(evidence, null, 2));
if (status === 'PASS') console.log('ASTRO_DEMO_LOCK_PREFLIGHT_PASS');
else console.error(`ASTRO_DEMO_LOCK_${status} ${[...missing, ...failures].join(',')}`);
process.exit(status === 'PASS' ? 0 : status === 'BLOCKED' ? 2 : 1);

