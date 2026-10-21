#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const base = process.env.TARGET_BASE || 'http://127.0.0.1:4406';
const startedAt = new Date().toISOString();
const results = [];
const cases = [
  { mutation: 'contact-heading', expected: 'contact-heading/desktop:fontSize' },
  { mutation: 'article-sticky', expected: 'rail position static, expected sticky' },
  { mutation: 'article-sidebar-dom', expected: 'missing .standards-card' },
  { mutation: 'page-spacing', expected: 'page-h2/desktop:margin' },
  { mutation: 'sitemap-type', expected: 'sitemap-link/desktop:fontSize' },
  { mutation: 'home-about-geometry', expected: 'home-about-panel/desktop:padding' },
  { mutation: 'home-latest-dom', expected: 'missing .lock-story-grid' },
  { mutation: 'home-process-style', expected: 'home-process-panel/desktop:borderRadius' },
  { mutation: 'home-team-card', expected: 'home-team-card/desktop:padding' },
  { mutation: 'footer-structure', expected: 'DOM contract .ft-cl>.ft-links' },
  { mutation: 'about-dom', expected: 'about/desktop: missing .purpose-panel' },
  { mutation: 'team-dom', expected: 'team/desktop: missing .staff-grid' },
  { mutation: 'category-dom', expected: 'category/desktop: missing .category-archive' },
  { mutation: 'author-dom', expected: 'author/desktop: missing .author-stories' },
  { mutation: '404-dom', expected: '404/desktop: missing .not-found-panel' },
  { mutation: 'page-wrapper-dom', expected: 'page/desktop: DOM contract .pg article>div count 0' },
];

for (const item of cases) {
  const run = spawnSync(process.execPath, ['scripts/validate-demo-lock.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, TARGET_BASE: base, DEMO_LOCK_MUTATION: item.mutation, DEMO_LOCK_FAST: '1' },
    encoding: 'utf8',
    timeout: 180000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  if (run.error) {
    console.error(`NEGATIVE_TEST_ERROR ${item.mutation}: ${run.error.message}`);
    process.exit(1);
  }
  if (run.status === 0) {
    console.error(`NEGATIVE_TEST_FAIL ${item.mutation}: validator accepted a deliberate violation`);
    process.exit(1);
  }
  if (!output.includes(item.expected)) {
    console.error(`NEGATIVE_TEST_FAIL ${item.mutation}: expected ${JSON.stringify(item.expected)} was absent`);
    console.error(output.slice(-3000));
    process.exit(1);
  }
  console.log(`NEGATIVE_TEST_PASS ${item.mutation}`);
  results.push({ mutation: item.mutation, expected: item.expected, rejected: true });
}

console.log(JSON.stringify({
  schema: 'astro-demo-lock-negative-evidence-v2',
  target: base,
  startedAt,
  completedAt: new Date().toISOString(),
  serial: true,
  results,
}, null, 2));
console.log(`ASTRO_DEMO_LOCK_NEGATIVE_TESTS_OK ${cases.length}`);
