#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';

const SITE = (process.env.SITE_URL || 'https://www.heraldnewstoday.com').replace(/\/$/, '');
const ADMIN = `${SITE}/admin/`;
const CLIENT_ID = process.env.TINA_CLIENT_ID || process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
const TOKEN = process.env.TINA_TOKEN;
const BRANCH = process.env.TINA_BRANCH || process.env.NEXT_PUBLIC_TINA_BRANCH || 'main';
const USERNAME = process.env.TINA_ADMIN_USERNAME;
const PASSWORD = process.env.TINA_ADMIN_PASSWORD;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_CONTENT_REPO;
if (![CLIENT_ID, TOKEN, USERNAME, PASSWORD, GITHUB_TOKEN, GITHUB_REPO].every(Boolean)) throw new Error('Publisher gate credentials are incomplete');
const TINA_URL = `https://content.tinajs.io/2.4/content/${CLIENT_ID}/github/${BRANCH}`;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const marker = `PAG-${stamp}`;

const allCases = [
  {
    name: 'Blog', route: 'blog/editorial-independence-and-sustainability', sourcePath: 'src/content/blog/editorial-independence-and-sustainability.mdx', field: 'title', publicPath: '/editorial-independence-and-sustainability/',
    query: `query { blog(relativePath: "editorial-independence-and-sustainability.mdx") { title } }`, value: d => d.blog.title,
  },
  {
    name: 'Page', route: 'page/editorial-guidelines', sourcePath: 'src/content/page/editorial-guidelines.mdx', field: 'title', publicPath: '/editorial-guidelines/',
    query: `query { page(relativePath: "editorial-guidelines.mdx") { title } }`, value: d => d.page.title,
  },
  {
    name: 'Categories', gateId: 'CATEGORY-ISLAND-EDITABILITY', route: 'category/Business', sourcePath: 'src/content/category/Business.json', field: 'title', publicPath: '/business/',
    query: `query { category(relativePath: "Business.json") { title } }`, value: d => d.category.title,
  },
  {
    name: 'Users', gateId: 'AUTHOR-ISLAND-EDITABILITY-001', route: 'user/admin', sourcePath: 'src/content/user/admin.json', field: 'role', publicPath: '/author/admin/',
    query: `query { user(relativePath: "admin.json") { role } }`, value: d => d.user.role,
  },
  {
    name: 'Navigation', route: 'navigation/header', sourcePath: 'src/content/navigation/header.json', field: 'items.0.label', publicPath: '/', expand: async page => {
      const row = page.getByText('Politics', { exact: true });
      if (await row.count() !== 1) throw new Error('Navigation: expected one baseline Politics row for items.0.label');
      await row.click();
    },
    query: `query { navigation(relativePath: "header.json") { items { label href } } }`, value: d => d.navigation.items[0].label,
  },
  {
    name: 'Global Config', route: 'config/config', sourcePath: 'src/content/config/config.json', field: 'footer.ctaEyebrow', publicPath: '/', expand: async page => page.getByText('Footer Content', { exact: true }).click(),
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
const scopedRun = requestedCollections.size > 0;
const matchedNames = new Set(cases.map((item) => item.name.toLowerCase()));
const unmatched = [...requestedCollections].filter((name) => !matchedNames.has(name));
if (!cases.length || unmatched.length) throw new Error(`PUBLISHER_GATE_COLLECTIONS contains unknown cases: ${unmatched.join(', ') || '(none matched)'}`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = value => createHash('sha256').update(value).digest('hex');
async function githubDocument(item) {
  const encodedPath = item.sourcePath.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedPath}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${item.name}: GitHub document HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.content) throw new Error(`${item.name}: GitHub document content is missing`);
  return { bytes: Buffer.from(payload.content.replace(/\s/g, ''), 'base64'), sha: payload.sha };
}
async function restoreGithubDocument(item, originalDocument) {
  const encodedPath = item.sourcePath.split('/').map(encodeURIComponent).join('/');
  const current = await githubDocument(item);
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedPath}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Restore ${item.name} byte-exactly after Publisher gate`,
      content: originalDocument.toString('base64'),
      sha: current.sha,
      branch: BRANCH,
    }),
  });
  if (!response.ok) throw new Error(`${item.name}: GitHub byte restoration HTTP ${response.status}`);
}
async function waitForDocument(item, predicate, label) {
  const deadline = Date.now() + 300_000;
  let lastHash = null;
  while (Date.now() < deadline) {
    const document = await githubDocument(item);
    lastHash = sha256(document.bytes);
    if (predicate(document.bytes)) return { hash: lastHash, bytes: document.bytes.length };
    await sleep(5000);
  }
  throw new Error(`${item.name}: timed out waiting for ${label}; last hash ${lastHash}`);
}
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
    let originalDocument = null;
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
      originalDocument = (await githubDocument(item)).bytes;
      const originalDocumentHash = sha256(originalDocument);
      const changedValue = `${original}${changedValueSuffix}`;
      await field.fill(changedValue);
      await clickSave(page);
      changed = true;
      const changedProof = await waitForProof(item, changedValue);
      const changedDocument = await waitForDocument(item, document => document.includes(Buffer.from(marker)), 'complete changed document');
      await field.fill(original);
      await clickSave(page);
      const restoredProof = await waitForProof(item, original, marker);
      const afterUiRestore = (await githubDocument(item)).bytes;
      const byteRestoreApplied = !afterUiRestore.equals(originalDocument);
      if (byteRestoreApplied) {
        await restoreGithubDocument(item, originalDocument);
        await waitForProof(item, original, marker);
      }
      const restoredDocument = await waitForDocument(
        item,
        document => document.equals(originalDocument) && !document.includes(Buffer.from(marker)),
        'byte-exact complete-document restoration',
      );
      changed = false;
      results.push({ collection: item.name, gateId: item.gateId || null, document: item.route, sourcePath: item.sourcePath, field: item.field, authenticatedEdit: true, saveBackendPublic: changedProof, changedDocument, exactRestore: restoredProof, byteRestoreApplied, originalDocumentHash, restoredDocument, unrelatedDrift: false, status: 'PASS' });
    } finally {
      if (changed && original) {
        const field = page.locator(`[name="${item.field}"]`);
        if (await field.count()) {
          await field.fill(original);
          await clickSave(page);
          await waitForProof(item, original, marker);
          if (originalDocument) {
            const current = (await githubDocument(item)).bytes;
            if (!current.equals(originalDocument)) await restoreGithubDocument(item, originalDocument);
            await waitForDocument(item, document => document.equals(originalDocument) && !document.includes(Buffer.from(marker)), 'emergency byte-exact restoration');
          }
        }
      }
    }
  }
  const status = scopedRun ? 'SCOPED' : 'PASS';
  console.log(JSON.stringify({ site: SITE, account: 'Publisher', adminAccessVerified: true, marker, status, configuredCollections: allCases.map(item => item.name), executedCollections: results.map(item => item.collection), collections: results, failures: [] }, null, 2));
  console.log(scopedRun ? 'PUBLISHER_ADMIN_GATE_SCOPED true' : 'PUBLISHER_ADMIN_GATE_OK true');
} finally {
  await browser.close();
}
