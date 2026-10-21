#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['scripts/verify-responsive-menu.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, RESPONSIVE_MENU_MUTATION: 'broken-aria-controls' },
  encoding: 'utf8',
  timeout: 180000,
});
const output = `${run.stdout || ''}\n${run.stderr || ''}`;
if (run.error) {
  console.error(`RESPONSIVE_MENU_NEGATIVE_ERROR ${run.error.message}`);
  process.exit(1);
}
if (run.status === 0 || !output.includes('1024: aria-controls mismatch')) {
  console.error('RESPONSIVE_MENU_NEGATIVE_FAIL validator accepted the broken aria-controls mutation or rejected it for the wrong reason');
  console.error(output.slice(-3000));
  process.exit(1);
}
console.log('RESPONSIVE_MENU_NEGATIVE_PASS broken-aria-controls');
