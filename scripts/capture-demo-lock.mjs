#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = (process.env.SITE_URL || 'http://127.0.0.1:4322').replace(/\/$/, '');
const out = path.resolve('evidence/astro-demo-lock');
fs.mkdirSync(out, { recursive: true });
const routes = {
  index: '/',
  about: '/about/',
  contact: '/contact/',
  'our-team': '/our-team/',
  'single-post': '/blog/editorial-independence-and-sustainability/',
  'single-category': '/business/',
  'single-author': '/author/admin/',
  'single-page': '/editorial-guidelines/',
  sitemap: '/sitemap/',
  '404': '/__demo_lock_missing__/',
};
const viewports = { desktop: { width: 1440, height: 1200 }, mobile: { width: 390, height: 844 } };
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const [name, route] of Object.entries(routes)) {
  for (const [mode, viewport] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    const expected = name === '404' ? 404 : 200;
    const status = response?.status() || 0;
    const result = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (status !== expected || !result.title || !result.h1 || result.overflow) failures.push({ name, mode, status, expected, ...result });
    await page.screenshot({ path: path.join(out, `${name}-${mode}.png`), fullPage: true });
    console.log(`${name} ${mode} ${status} ${viewport.width}x${viewport.height}`);
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exit(1);
