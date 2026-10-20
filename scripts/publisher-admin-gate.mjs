#!/usr/bin/env node
import { chromium } from 'playwright';

const SITE = (process.env.SITE_URL || 'https://www.heraldnewstoday.com').replace(/\/$/, '');
const ADMIN = `${SITE}/admin/`;
const CLIENT_ID = process.env.TINA_CLIENT_ID || process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
const TOKEN = process.env.TINA_TOKEN;
const BRANCH = process.env.TINA_BRANCH || process.env.NEXT_PUBLIC_TINA_BRANCH || 'main';
const USERNAME = process.env.TINA_ADMIN_USERNAME;
const PASSWORD = process.env.TINA_ADMIN_PASSWORD;
if (![CLIENT_ID, TOKEN, USERNAME, PASSWORD].every(Boolean)) throw new Error('Publisher gate credentials are incomplete');
const TINA_URL = `https://content.tinajs.io/2.4/content/${CLIENT_ID}/github/${BRANCH}`;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const marker = `PAG-${stamp}`;

const allCases = [
  {
    name: 'Blog', route: 'blog/editorial-independence-and-sustainability', field: 'title', publicPath: '/editorial-independence-and-sustainability/',
    query: `query { blog(relativePath: "editorial-independence-and-sustainability.mdx") { title } }`, value: d => d.blog.title,
  },
  {
    name: 'Page', route: 'page/editorial-guidelines', field: 'title', publicPath: '/editorial-guidelines/',
    query: `query { page(relativePath: "editorial-guidelines.mdx") { title } }`, value: d => d.page.title,
  },
  {
    name: 'Categories', route: 'category/Business', field: 'title', publicPath: '/business/',
    query: `query { category(relativePath: "Business.json") { title } }`, value: d => d.category.title,
  },
  {
    name: 'Users', route: 'user/admin', field: 'role', publicPath: '/author/admin/',
    query: `query { user(relativePath: "admin.json") { role } }`, value: d => d.user.role,
  },
  {
    name: 'Navigation', route: 'navigation/header', field: 'items.0.label', publicPath: '/', expand: async page => page.getByText('Business', { exact: true }).click(),
    query: `query { navigation(relativePath: "header.json") { items { label href } } }`, value: d => d.navigation.items[0].label,
  },
  {
    name: 'Global Config', route: 'config/config', field: 'footer.ctaEyebrow', publicPath: '/', expand: async page => page.getByText('Footer Content', { exact: true }).click(),
    query: `query { config(relativePath: "config.json") { footer { ctaEyebrow } } }`, value: d => d.config.footer.ctaEyebrow,
  },
];
const requestedCollections = new Set(
  (process.env.PUBLISHER_GATE_COLLECTIONS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const cases = requestedCollections.size
  ? allCases.filter((item) => requestedCollections.has(item.name.toLowerCase()))
  : allCases;
if (!cases.length) throw new Error('PUBLISHER_GATE_COLLECTIONS did not match any configured gate case');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function backendValue(item) {
  const response = await fetch(TINA_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': TOKEN, 'Content-Type': 'application/json', 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({ query: item.query }),
  });
  if (!response.ok) throw new Error(`${item.name}: Tina API HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors) throw new Error(`${item.name}: ${JSON.stringify(payload.errors)}`);
  return item.value(payload.data);
}
async function publicHtml(item) {
  const response = await fetch(`${SITE}${item.publicPath}?publisher-admin-gate=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
  if (!response.ok) throw new Error(`${item.name}: public route HTTP ${response.status}`);
  return response.text();
}
async function waitForProof(item, expected, forbidden = '') {
  const deadline = Date.now() + 300_000;
  let last = {};
  while (Date.now() < deadline) {
    try {
      const [backend, html] = await Promise.all([backendValue(item), publicHtml(item)]);
      last = { backend, publicHasExpected: html.includes(expected), publicHasForbidden: forbidden ? html.includes(forbidden) : false };
      if (backend === expected && html.includes(expected) && (!forbidden || !html.includes(forbidden))) return last;
    } catch (error) { last = { error: String(error) }; }
    await sleep(5000);
  }
  throw new Error(`${item.name}: timed out waiting for backend/public proof: ${JSON.stringify(last)}`);
}
async function clickSave(page) {
  const save = page.locator('button').filter({ hasText: /^Save$/ }).last();
  await save.waitFor({ state: 'visible', timeout: 60_000 });
  await save.click();
  await sleep(8000);
}

const browser = await chromium.launch({ headless: process.env.DISPLAY ? false : true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const results = [];
try {
  await page.goto(ADMIN, { waitUntil: 'networkidle', timeout: 120_000 });
  await sleep(5000);
  const enter = page.getByRole('button', { name: /Enter Edit Mode/i });
  const popupPromise = page.context().waitForEvent('page');
  await enter.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await popup.locator('input').nth(0).fill(USERNAME);
  await popup.locator('input').nth(1).fill(PASSWORD);
  await popup.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(10_000);
  if (!page.url().includes('/admin/#/')) throw new Error(`Publisher authentication did not return to Tina admin: ${page.url()}`);

  for (const item of cases) {
    let original = '';
    let changed = false;
    const changedValueSuffix = ` · ${marker}`;
    try {
      await page.goto(`${ADMIN}#/collections/edit/${item.route}`);
      await page.waitForTimeout(6000);
      if (item.expand) { await item.expand(page); await page.waitForTimeout(500); }
      const field = page.locator(`[name="${item.field}"]`);
      await field.waitFor({ state: 'visible', timeout: 60_000 });
      original = await field.inputValue();
      if (!original) throw new Error(`${item.name}: selected field ${item.field} is empty`);
      const changedValue = `${original}${changedValueSuffix}`;
      await field.fill(changedValue);
      await clickSave(page);
      changed = true;
      const changedProof = await waitForProof(item, changedValue);
      await field.fill(original);
      await clickSave(page);
      const restoredProof = await waitForProof(item, original, marker);
      changed = false;
      results.push({ collection: item.name, document: item.route, field: item.field, authenticatedEdit: true, saveBackendPublic: changedProof, exactRestore: restoredProof, status: 'PASS' });
    } finally {
      if (changed && original) {
        const field = page.locator(`[name="${item.field}"]`);
        if (await field.count()) {
          await field.fill(original);
          await clickSave(page);
          await waitForProof(item, original, marker);
        }
      }
    }
  }
  console.log(JSON.stringify({ site: SITE, account: 'Publisher', adminAccessVerified: true, marker, collections: results, failures: [] }, null, 2));
  console.log('PUBLISHER_ADMIN_GATE_OK true');
} finally {
  await browser.close();
}
