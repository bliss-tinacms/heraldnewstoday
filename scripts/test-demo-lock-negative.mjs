#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const base = process.env.TARGET_BASE || 'http://127.0.0.1:4406';
const cases = [
  { mutation: 'contact-accent', expected: 'accent text' },
  { mutation: 'article-sticky', expected: 'rail position static, expected sticky' },
];

for (const item of cases) {
  const run = spawnSync(process.execPath, ['scripts/validate-demo-lock.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, TARGET_BASE: base, DEMO_LOCK_MUTATION: item.mutation },
    encoding: 'utf8',
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  if (run.status === 0) {
    console.error(`NEGATIVE_TEST_FAIL ${item.mutation}: validator accepted a deliberate violation`);
    process.exit(1);
  }
  if (!output.includes(item.expected)) {
    console.error(`NEGATIVE_TEST_FAIL ${item.mutation}: expected failure text ${JSON.stringify(item.expected)} was absent`);
    process.exit(1);
  }
  console.log(`NEGATIVE_TEST_PASS ${item.mutation}`);
}

console.log('ASTRO_DEMO_LOCK_NEGATIVE_TESTS_OK true');
