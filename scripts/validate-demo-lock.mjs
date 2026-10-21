#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, statfsSync, unlinkSync, writeFileSync } from 'node:fs';
import { freemem, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const base = (process.env.TARGET_BASE || 'http://127.0.0.1:4406').replace(/\/$/, '');
const mutation = process.env.DEMO_LOCK_MUTATION || '';
const fast = process.env.DEMO_LOCK_FAST === '1';
const fixtureRoot = resolve(root, 'tests/fixtures/astro-demo-lock/authoritative');
const failures = [];
const passes = [];
const visuals = [];
const startedAt = new Date().toISOString();
const executionMode = /^https:\/\//.test(base) ? 'live' : 'local-production';
const runLock = '/tmp/astro-demo-lock-browser.lock';
let ownsRunLock = false;

function releaseRunLock() {
  if (!ownsRunLock) return;
  try { unlinkSync(runLock); } catch {}
  ownsRunLock = false;
}

function acquireRunLock() {
  const attempt = () => {
    const fd = openSync(runLock, 'wx', 0o600);
    writeFileSync(fd, JSON.stringify({ pid: process.pid, root, base, startedAt }));
    closeSync(fd);
    ownsRunLock = true;
  };
  try { attempt(); return; } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  let owner = null;
  try { owner = JSON.parse(readFileSync(runLock, 'utf8')); } catch {}
  let alive = false;
  if (Number.isInteger(owner?.pid)) {
    try { process.kill(owner.pid, 0); alive = true; } catch {}
  }
  if (alive) {
    console.error(`ASTRO_DEMO_LOCK_BLOCKED concurrent browser gate pid=${owner.pid} target=${owner.base || 'unknown'}`);
    process.exit(2);
  }
  try { unlinkSync(runLock); } catch {}
  attempt();
}

acquireRunLock();
process.on('exit', releaseRunLock);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { releaseRunLock(); process.exit(128 + (signal === 'SIGINT' ? 2 : 15)); });

const resourceEvidence = {};
for (const path of ['/', '/tmp', '/dev/shm']) {
  const stats = statfsSync(path);
  resourceEvidence[path] = Number(stats.bavail) * Number(stats.bsize);
}
resourceEvidence.freeMemory = freemem();
resourceEvidence.totalMemory = totalmem();
for (const path of ['/', '/tmp']) {
  if (resourceEvidence[path] < 256 * 1024 * 1024) failures.push(`resource preflight: ${path} has less than 256 MiB free`);
}
if (resourceEvidence['/dev/shm'] < 32 * 1024 * 1024) failures.push('resource preflight: /dev/shm has less than 32 MiB free');
if (resourceEvidence.freeMemory < 256 * 1024 * 1024) failures.push('resource preflight: less than 256 MiB memory available');

function fail(message) { failures.push(message); }
function pass(message) { passes.push(message); }
function near(actual, expected, tolerance, label) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) fail(`${label}: ${actual}, expected ${expected} ±${tolerance}`);
  else pass(label);
}

// The authority cannot silently move with the implementation.
const sumsPath = resolve(fixtureRoot, 'SHA256SUMS');
let fixtureManifestSha256 = null;
if (!existsSync(sumsPath)) fail('authority: missing SHA256SUMS');
else {
  fixtureManifestSha256 = createHash('sha256').update(readFileSync(sumsPath)).digest('hex');
  for (const line of readFileSync(sumsPath, 'utf8').trim().split('\n')) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match) { fail(`authority: malformed checksum line ${line}`); continue; }
    const [, expected, relative] = match;
    const file = resolve(root, relative);
    if (!file.startsWith(fixtureRoot) || !existsSync(file)) { fail(`authority: missing fixture ${relative}`); continue; }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (actual !== expected) fail(`authority: hash drift ${relative}`); else pass(`authority:${relative}`);
  }
}

const routes = [
  { name: 'home', path: '/', status: 200, required: ['.lock-hero-wrap>.lock-hero', '.lock-topic-grid', '.lock-about-panel', '.lock-story-grid', '.lock-process-panel', '.lock-team-grid'] },
  { name: 'about', path: '/about/', status: 200, required: ['.about-hero-panel', '.purpose-panel', '.standards-grid'] },
  { name: 'contact', path: '/contact/', status: 200, required: ['.ffn-demo-contact .ph', '.contact-grid', '.contact-guide', '.contact-form'] },
  { name: 'team', path: '/our-team/', status: 200, required: ['.team-hero-panel', '.leader-list', '.staff-grid'] },
  { name: 'article', path: '/editorial-independence-and-sustainability/', status: 200, required: ['.article-main', '.li', '.pr', '.rl', '.toc-wide', '.toc-compact', '.standards-card'] },
  { name: 'page', path: '/editorial-guidelines/', status: 200, required: ['.ffn-demo-page-template .pt', '.ffn-demo-page-template .pg article'] },
  { name: 'sitemap', path: '/sitemap/', status: 200, required: ['.sitemap-simple-grid', '#sitemap-pages-title', '#sitemap-posts-title'] },
  { name: 'category', path: '/business/', status: 200, required: ['.category-archive'] },
  { name: 'author', path: '/author/admin/', status: 200, required: ['.author-stories'] },
  { name: '404', path: '/__astro_demo_lock_missing__/', status: 404, required: ['.not-found-panel', '.not-found-code'] },
];

const viewports = fast ? [{ name: 'desktop', width: 1440, height: 900 }] : [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const pages = new Map();
const sourcePages = new Map();

async function closeCaches() {
  for (const page of [...pages.values(), ...sourcePages.values()]) {
    if (!page.isClosed()) await page.close();
  }
  pages.clear();
  sourcePages.clear();
}

async function applyMutation(page, routeName) {
  const mutations = {
    'contact-heading': ['contact', `.ffn-demo-contact .ph h1`, 'font-size', '61px'],
    'article-sticky': ['article', '.rl', 'position', 'static'],
    'article-sidebar-dom': ['article', '.standards-card', 'remove'],
    'page-spacing': ['page', '.pg article h2', 'margin', '0px'],
    'sitemap-type': ['sitemap', '.sitemap-simple-col a', 'font-size', '13px'],
    'home-about-geometry': ['home', '.lock-about-panel', 'padding', '20px'],
    'home-latest-dom': ['home', '.lock-story-grid', 'remove'],
    'home-process-style': ['home', '.lock-process-panel', 'border-radius', '0px'],
    'home-team-card': ['home', '.lock-person', 'padding', '2px'],
    'footer-structure': ['home', '.ft .ft-links', 'remove'],
    'about-dom': ['about', '.purpose-panel', 'remove'],
    'team-dom': ['team', '.staff-grid', 'remove'],
    'category-dom': ['category', '.category-archive', 'remove'],
    'author-dom': ['author', '.author-stories', 'remove'],
    '404-dom': ['404', '.not-found-panel', 'remove'],
    'page-wrapper-dom': ['page', '.pg article>div', 'remove'],
  };
  const spec = mutations[mutation];
  if (!spec || spec[0] !== routeName) return;
  await page.evaluate(([selector, property, value]) => {
    const node = document.querySelector(selector);
    if (!node) return;
    if (property === 'remove') node.remove();
    else node.style.setProperty(property, value, 'important');
  }, spec.slice(1));
}

async function localPage(route, viewport) {
  const key = `${viewport.name}:${route.name}`;
  if (pages.has(key)) return pages.get(key);
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const response = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
  const status = response?.status() ?? 0;
  if (status !== route.status) fail(`${route.name}/${viewport.name}: HTTP ${status}, expected ${route.status}`); else pass(`${route.name}/${viewport.name}:http`);
  await applyMutation(page, route.name);
  pages.set(key, page);
  return page;
}

async function sourcePage(kind, viewport) {
  const key = `${viewport.name}:${kind}`;
  if (sourcePages.has(key)) return sourcePages.get(key);
  const file = resolve(fixtureRoot, kind, `${viewport.name}-dom.html`);
  if (!existsSync(file)) throw new Error(`Missing source DOM ${file}`);
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  let loaded = false;
  let lastError;
  for (let attempt = 0; attempt < 3 && !loaded; attempt += 1) {
    try { await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); loaded = true; }
    catch (error) { lastError = error; await page.waitForTimeout(200); }
  }
  if (!loaded) throw lastError;
  sourcePages.set(key, page);
  return page;
}

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await localPage(route, viewport);
    const state = await page.evaluate(({ width, required }) => ({
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width,
      header: document.querySelector('.mh')?.getBoundingClientRect().height || 0,
      footer: Boolean(document.querySelector('.ft')),
      missing: required.filter((selector) => !document.querySelector(selector)),
    }), { width: viewport.width, required: route.required });
    if (state.missing.length) fail(`${route.name}/${viewport.name}: missing ${state.missing.join(', ')}`); else pass(`${route.name}/${viewport.name}:dom-required`);
    if (!state.footer) fail(`${route.name}/${viewport.name}: missing footer`); else pass(`${route.name}/${viewport.name}:footer`);
    if (viewport.name === 'mobile' && state.overflow > 1) fail(`${route.name}/mobile: horizontal overflow ${state.overflow}`); else pass(`${route.name}/${viewport.name}:overflow`);
    const expectedHeader = viewport.name === 'desktop' ? 89 : 78;
    near(state.header, expectedHeader, 1, `${route.name}/${viewport.name}:header-height`);
  }
}

// Explicit authored DOM contract. Dynamic Tina text and image URLs are intentionally excluded.
const domContracts = [
  ['home', '.lock-hero-wrap>.lock-hero>.lock-hero-image', 1],
  ['home', '.lock-hero>.lock-hero-shade-x+.lock-hero-shade-y+.lock-hero-copy', 1],
  ['home', '.lock-topic>.lock-topic-image+.lock-topic-copy', 1],
  ['home', '.lock-about-panel>.lock-about-copygroup+.lock-value-grid', 1],
  ['home', '.lock-story>div>.lock-story-cat', 1],
  ['home', '.lock-commitment-panel>.lock-commitment-image+.lock-commitment-copy', 1],
  ['home', '.lock-process-panel>.lock-process-copy+.lock-process-list', 1],
  ['home', '.lock-team-grid>.lock-person', 4],
  ['contact', '.contact-grid>.contact-guide+.contact-form', 1],
  ['page', '.pg article>div', 1],
  ['sitemap', '.sitemap-simple-grid>.sitemap-simple-col', 2],
  ['article', '.bd-in>.article-main+.rl', 1],
  ['article', '.rl>.toc-wide+.standards-card', 1],
  ['home', '.ft-pitch-wrap+.ft', 1],
  ['home', '.ft-main>.ft-cl+.ft-lg', 1],
  ['home', '.ft-cl>.ft-links', 1],
];
for (const viewport of viewports) {
  for (const [routeName, selector, minimum] of domContracts) {
    const route = routes.find((item) => item.name === routeName);
    const page = await localPage(route, viewport);
    const count = await page.locator(selector).count();
    if (count < minimum) fail(`${routeName}/${viewport.name}: DOM contract ${selector} count ${count}, expected >=${minimum}`);
    else pass(`${routeName}/${viewport.name}:dom:${selector}`);
  }
}

await closeCaches();

async function resolveSourceNode(page, spec) {
  return page.evaluateHandle((spec) => {
    const exact = [...document.querySelectorAll('*')]
      .filter((node) => node.textContent?.trim() === spec.text)
      .sort((a, b) => a.children.length - b.children.length)[0];
    if (!exact) return null;
    let node = exact;
    if (spec.closest) node = node.closest(spec.closest);
    for (let index = 0; index < (spec.up || 0); index += 1) node = node?.parentElement;
    if (spec.sectionLast) node = exact.closest('section')?.lastElementChild;
    if (spec.sectionFirst) node = exact.closest('section')?.firstElementChild;
    if (spec.query) node = node?.querySelector(spec.query);
    return node || null;
  }, spec);
}

async function metricFromHandle(handle) {
  return handle.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const s = getComputedStyle(node);
    const round = (n) => Math.round(n * 100) / 100;
    return {
      box: { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) },
      style: {
        display: s.display, position: s.position, top: s.top, padding: s.padding, margin: s.margin,
        gap: s.gap, borderRadius: s.borderRadius, backgroundColor: s.backgroundColor, color: s.color,
        fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
        gridTemplateColumns: s.gridTemplateColumns,
      },
    };
  });
}

const comparisons = [
  { name: 'home-coverage-title', route: 'home', kind: 'index', source: { text: 'What we cover' }, local: '.lock-coverage h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin','color'] },
  { name: 'home-about-title', route: 'home', kind: 'index', source: { text: 'A broader view of today’s stories.' }, local: '.lock-about h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'home-about-panel', route: 'home', kind: 'index', source: { text: 'A broader view of today’s stories.', up: 2 }, local: '.lock-about-panel', styles: ['display','padding','gap','borderRadius','backgroundColor','gridTemplateColumns'], box: ['width'] },
  { name: 'home-about-values', route: 'home', kind: 'index', source: { text: 'A broader view of today’s stories.', up: 2, query: ':scope > div:last-child' }, local: '.lock-value-grid', styles: ['display','gap','gridTemplateColumns'], box: ['width'] },
  { name: 'home-latest-title', route: 'home', kind: 'index', source: { text: 'Today’s top stories' }, local: '.lock-stories h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'home-latest-grid', route: 'home', kind: 'index', source: { text: 'Today’s top stories', sectionLast: true }, local: '.lock-story-grid', styles: ['display','gap','gridTemplateColumns'], box: ['width'] },
  { name: 'home-process-title', route: 'home', kind: 'index', source: { text: 'The questions every story answers' }, local: '.lock-process h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'home-process-panel', route: 'home', kind: 'index', source: { text: 'The questions every story answers', up: 2 }, local: '.lock-process-panel', styles: ['display','padding','gap','borderRadius','backgroundColor'], box: ['width','height'] },
  { name: 'home-team-title', route: 'home', kind: 'index', source: { text: 'Who does the reporting' }, local: '.lock-team h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'home-team-grid', route: 'home', kind: 'index', source: { text: 'Who does the reporting', sectionLast: true }, local: '.lock-team-grid', styles: ['display','gap','gridTemplateColumns'], box: ['width'] },
  { name: 'home-team-card', route: 'home', kind: 'index', source: { text: 'Joseph Baldwin', closest: 'a' }, local: '.lock-person', styles: ['display','padding','gap','borderRadius','backgroundColor'], box: ['width'] },
  { name: 'home-cta', route: 'home', kind: 'index', source: { text: 'Have a story worth telling?', up: 2 }, local: '.ft-pitch', styles: ['display','padding','gap','borderRadius','backgroundColor'], box: ['width','height'] },
  { name: 'contact-heading', route: 'contact', kind: 'contact', source: { text: 'Get in touch with the newsroom.' }, local: '.ffn-demo-contact .ph h1', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin','color'], box: ['width','height'] },
  { name: 'contact-panel', route: 'contact', kind: 'contact', source: { text: 'Get in touch with the newsroom.', up: 1 }, local: '.ffn-demo-contact .ph>.w', styles: ['padding','borderRadius','backgroundColor'], box: ['width','height'] },
  { name: 'page-heading', route: 'page', kind: 'page', source: { text: 'Editorial Guidelines' }, local: '.ffn-demo-page-template .pt h1', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'], box: ['width','height'] },
  { name: 'page-h2', route: 'page', kind: 'page', source: { text: 'Accuracy' }, local: '.ffn-demo-page-template .pg h2', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'sitemap-heading', route: 'sitemap', kind: 'sitemap', source: { text: 'Sitemap' }, local: '.ffn-demo-sitemap h1', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'], box: ['width','height'] },
  { name: 'sitemap-pages', route: 'sitemap', kind: 'sitemap', source: { text: 'Pages' }, local: '#sitemap-pages-title', styles: ['fontSize','fontWeight','lineHeight','letterSpacing','margin'] },
  { name: 'sitemap-link', route: 'sitemap', kind: 'sitemap', source: { text: 'Home', closest: 'a' }, local: '.sitemap-simple-col a', styles: ['fontSize','fontWeight','lineHeight','padding','color'] },
  { name: 'article-toc', route: 'article', kind: 'article', source: { text: 'Table of Contents', up: 1 }, local: '.toc-wide', styles: ['display','padding','gap','borderRadius','backgroundColor'], box: ['width'] },
  { name: 'article-standard-card', route: 'article', kind: 'article', source: { text: 'How we report', up: 1 }, local: '.standards-card', styles: ['display','padding','gap','borderRadius','backgroundColor'], box: ['width','height'] },
];

for (const [viewportIndex, viewport] of viewports.entries()) {
  if (viewportIndex > 0) await closeCaches();
  for (const item of comparisons) {
    const route = routes.find((candidate) => candidate.name === item.route);
    const local = await localPage(route, viewport);
    const source = await sourcePage(item.kind, viewport);
    const sourceHandle = await resolveSourceNode(source, item.source);
    const localSelector = viewport.name === 'mobile' && item.name === 'article-toc' ? '.toc-compact' : item.local;
    const localHandle = await local.$(localSelector);
    if (!sourceHandle || !localHandle) { fail(`${item.name}/${viewport.name}: missing comparison node`); continue; }
    const [a, b] = await Promise.all([metricFromHandle(sourceHandle), metricFromHandle(localHandle)]);
    for (const property of item.styles || []) {
      if (a.style[property] !== b.style[property]) fail(`${item.name}/${viewport.name}:${property} ${b.style[property]}, source ${a.style[property]}`);
      else pass(`${item.name}/${viewport.name}:${property}`);
    }
    for (const property of item.box || []) near(b.box[property], a.box[property], 1, `${item.name}/${viewport.name}:${property}`);
    await sourceHandle.dispose();
    await localHandle.dispose();
  }
}

// Desktop/mobile visibility and true sticky behavior.
for (const viewport of viewports) {
  const article = await localPage(routes.find((item) => item.name === 'article'), viewport);
  const visibility = await article.evaluate(() => {
    const shown = (selector) => { const node = document.querySelector(selector); return node && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height > 0; };
    return { wide: shown('.toc-wide'), compact: shown('.toc-compact'), railPosition: getComputedStyle(document.querySelector('.rl')).position };
  });
  if (viewport.name === 'desktop') {
    if (!visibility.wide || visibility.compact) fail('article/desktop: must show wide TOC and hide compact TOC'); else pass('article/desktop:toc-visibility');
    if (visibility.railPosition !== 'sticky') fail(`article/desktop: rail position ${visibility.railPosition}, expected sticky`); else pass('article/desktop:sticky-style');
    const sticky = await article.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto'; document.body.style.scrollBehavior = 'auto';
      const rail = document.querySelector('.rl'); const articleBody = document.querySelector('.pr');
      articleBody.style.minHeight = `${Math.max(articleBody.scrollHeight, rail.scrollHeight + 1900)}px`;
      scrollTo(0, 0); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const initial = rail.getBoundingClientRect().top;
      return { initial, height: rail.getBoundingClientRect().height };
    });
    await article.mouse.wheel(0, Math.ceil(sticky.initial + 700));
    await article.waitForFunction(() => window.scrollY > 700);
    await article.waitForTimeout(150);
    const pinned = await article.evaluate(() => ({ y: document.querySelector('.rl').getBoundingClientRect().top, scrollY }));
    near(pinned.y, 96, 1.5, 'article/desktop:real-wheel-sticky-top');
    if (pinned.scrollY <= 700) fail(`article/desktop: wheel did not complete (${pinned.scrollY})`); else pass('article/desktop:real-wheel-scroll-complete');
  } else {
    if (visibility.wide || !visibility.compact) fail('article/mobile: must hide wide TOC and show compact TOC'); else pass('article/mobile:toc-visibility');
    if (visibility.railPosition !== 'static') fail(`article/mobile: rail position ${visibility.railPosition}, expected static`); else pass('article/mobile:nonsticky');
  }
}

// Mask mutable text/images, then compare the actual rendered design surfaces.
async function maskedScreenshot(page, handle) {
  await handle.evaluate((node) => {
    node.setAttribute('data-demo-lock-shot', '');
    const style = document.createElement('style');
    style.setAttribute('data-demo-lock-mask', '');
    style.textContent = `[data-demo-lock-shot] img{visibility:hidden!important}[data-demo-lock-shot],[data-demo-lock-shot] *{color:transparent!important;text-shadow:none!important;caret-color:transparent!important}`;
    document.head.appendChild(style);
    for (const element of [node, ...node.querySelectorAll('*')]) {
      element.style.setProperty('color', 'transparent', 'important');
      element.style.setProperty('text-shadow', 'none', 'important');
    }
  });
  await handle.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await page.waitForTimeout(100);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await handle.screenshot({ animations: 'disabled', caret: 'hide' }); }
    catch (error) { lastError = error; await page.waitForTimeout(150); }
  }
  throw lastError;
}
async function compareVisual(item) {
  console.error(`ASTRO_DEMO_LOCK_VISUAL ${item.name}`);
  const viewport = viewports.find((v) => v.name === 'desktop');
  const route = routes.find((candidate) => candidate.name === item.route);
  const local = await localPage(route, viewport);
  const source = await sourcePage(item.kind, viewport);
  const aHandle = await resolveSourceNode(source, item.source);
  const bHandle = await local.$(item.local);
  if (!aHandle || !bHandle) { fail(`${item.name}: missing visual node`); return; }
  const [aPng, bPng] = await Promise.all([maskedScreenshot(source, aHandle), maskedScreenshot(local, bHandle)]);
  if (process.env.DEMO_LOCK_SAVE_VISUALS === '1') {
    await Promise.all([sharp(aPng).toFile(`/tmp/${item.name}-source.png`), sharp(bPng).toFile(`/tmp/${item.name}-local.png`)]);
  }
  const [a, b] = await Promise.all([sharp(aPng).removeAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(bPng).removeAlpha().raw().toBuffer({ resolveWithObject: true })]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    fail(`${item.name}: screenshot ${b.info.width}x${b.info.height}, source ${a.info.width}x${a.info.height}`);
  } else {
    let total = 0; for (let i = 0; i < a.data.length; i += 1) total += Math.abs(a.data[i] - b.data[i]);
    const mae = total / a.data.length; visuals.push({ name: item.name, width: a.info.width, height: a.info.height, mae });
    if (mae > item.maxMae) fail(`${item.name}: masked screenshot MAE ${mae.toFixed(3)}, max ${item.maxMae}`); else pass(`${item.name}:screenshot`);
  }
  await aHandle.dispose(); await bHandle.dispose();
}
if (!fast) {
  await closeCaches();
  for (const item of [
    { name: 'visual-contact-panel', route: 'contact', kind: 'contact', source: { text: 'Get in touch with the newsroom.', up: 1 }, local: '.ffn-demo-contact .ph>.w', maxMae: 1 },
    { name: 'visual-page-header', route: 'page', kind: 'page', source: { text: 'Editorial Guidelines', up: 1 }, local: '.ffn-demo-page-template .pt>.w', maxMae: 1 },
    { name: 'visual-home-about', route: 'home', kind: 'index', source: { text: 'A broader view of today’s stories.', up: 2 }, local: '.lock-about-panel', maxMae: 2 },
    { name: 'visual-home-process', route: 'home', kind: 'index', source: { text: 'The questions every story answers', up: 2 }, local: '.lock-process-panel', maxMae: 2 },
    { name: 'visual-home-cta', route: 'home', kind: 'index', source: { text: 'Have a story worth telling?', up: 2 }, local: '.ft-pitch', maxMae: 2 },
    { name: 'visual-article-standards', route: 'article', kind: 'article', source: { text: 'How we report', up: 1 }, local: '.standards-card', maxMae: 2 },
  ]) {
    await compareVisual(item);
    await closeCaches();
  }
}

for (const page of [...pages.values(), ...sourcePages.values()]) await page.close();
await browser.close();

console.log(JSON.stringify({
  schema: 'astro-demo-lock-evidence-v2',
  target: base,
  mode: executionMode,
  startedAt,
  completedAt: new Date().toISOString(),
  pid: process.pid,
  mutation: mutation || null,
  fast,
  fixtureManifestSha256,
  viewports,
  resources: resourceEvidence,
  passes: passes.length,
  failures,
  visuals,
}, null, 2));
if (failures.length) process.exit(1);
console.log('ASTRO_DEMO_LOCK_OK true');
