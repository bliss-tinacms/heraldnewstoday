#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const base = (process.env.TARGET_BASE || 'http://127.0.0.1:4406').replace(/\/$/, '');
const mutation = process.env.DEMO_LOCK_MUTATION || '';
const contactBaselineUrl = new URL('../tests/fixtures/astro-demo-lock/contact-1408-authoritative.png', import.meta.url);
const expectedContactBaselineHash = '2daa04dd344cfd4cb32a6e07364b5703b19ab65461b725b93d00bad27672a1b7';
const expectedDomHashes = {
  contact: '2afe2d561c26912ad9b27338de0448197e387a1b3dcec97eae29c769f3fdce2e',
  article: 'b98b2640a94e28517f7cbee9dbb84d6f9929d012d5b149fbf7086be6a5f6a593',
};
const cases = [
  { name: 'homepage', path: '/', selector: '.lock-hero h1', frame: '.lock-hero', desktop: 120.96, mobile: 52, required: ['.lock-topic-grid', '.lock-about-panel', '.lock-story-grid', '.lock-commitment-panel', '.lock-process-panel', '.lock-team-grid'] },
  { name: 'about', path: '/about/', selector: '.about-hero-wrap h1', frame: '.about-hero-panel', desktop: 92.16, mobile: 44, required: ['.broader-image', '.purpose-panel', '.standards-grid', '.readers-grid', '.explore-section'] },
  { name: 'contact', path: '/contact/', selector: '.ffn-demo-contact h1', frame: '.ffn-demo-contact .ph > .w', desktop: 96, mobile: 44, required: ['.contact-guide', '.contact-form', 'form'] },
  { name: 'team', path: '/our-team/', selector: '.team-hero h1', frame: '.team-hero-panel', desktop: 92.16, mobile: 44, required: ['.leader-list', '.leader-card', '.staff-grid'] },
  { name: 'article', path: '/blog/editorial-independence-and-sustainability/', selector: '.ah h1', frame: '.ah > .w', desktop: 80.64, mobile: 40, required: ['.li', '.pr', '#about-author', '.standards-card'] },
  { name: 'category', path: '/business/', selector: '.category-heading h1', frame: '.category-heading__inner', desktop: 92.16, mobile: 44, required: ['.category-archive'] },
  { name: 'author', path: '/author/admin/', selector: '.author-heading h1', frame: '.author-heading__inner', desktop: 92.16, mobile: 44, required: ['.author-heading__portrait', '.author-stories'] },
  { name: 'page', path: '/editorial-guidelines/', selector: '.ffn-demo-page-template h1', frame: '.ffn-demo-page-template .pt > .w', desktop: 92.16, mobile: 44, required: ['.pg', '.pg article'] },
  { name: 'sitemap', path: '/sitemap/', selector: '.ffn-demo-sitemap h1', frame: '.sitemap-simple-hero > .w', desktop: 92.16, mobile: 44, required: ['.sitemap-simple-grid', '#sitemap-pages-title', '#sitemap-posts-title'] },
  { name: '404', path: '/__astro_demo_lock_missing__/', selector: '.not-found-panel h1', frame: '.not-found-panel', desktop: 92.16, mobile: 44, status: 404, required: ['.not-found-code', '.not-found-panel'] },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];

const failures = [];
const results = [];
const visual = {};
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    for (const item of cases) {
      const response = await page.goto(`${base}${item.path}`, { waitUntil: 'networkidle' });
      const expectedStatus = item.status || 200;
      if (!response || response.status() !== expectedStatus) {
        failures.push(`${item.name}/${viewport.name}: expected HTTP ${expectedStatus}, got ${response?.status() ?? 'no response'}`);
        continue;
      }
      if (mutation === 'contact-accent' && item.name === 'contact') {
        await page.evaluate(() => document.querySelector('.ffn-demo-contact .ph h1 span')?.remove());
      }
      if (mutation === 'article-sticky' && item.name === 'article') {
        await page.evaluate(() => document.querySelector('.rl')?.style.setProperty('position', 'static', 'important'));
      }
      if (viewport.name === 'desktop' && (item.name === 'contact' || item.name === 'article')) {
        const signature = await page.$eval(item.name === 'contact' ? '.ffn-demo-contact' : '.ffn-demo-article', (root) => {
          const walk = (node) => {
            const classes = [...node.classList].sort().join('.');
            return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}[${[...node.children].map(walk).join('')}]`;
          };
          return walk(root);
        });
        const domHash = createHash('sha256').update(signature).digest('hex');
        if (domHash !== expectedDomHashes[item.name]) failures.push(`${item.name}/desktop: DOM structure hash ${domHash}, expected ${expectedDomHashes[item.name]}`);
      }
      const observed = await page.evaluate(({ item, viewport }) => {
        const heading = document.querySelector(item.selector);
        const frame = document.querySelector(item.frame);
        const header = document.querySelector('.mh');
        const footer = document.querySelector('.ft');
        const main = document.querySelector('main, .ah');
        const missing = item.required.filter((selector) => !document.querySelector(selector));
        const fontSize = heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : null;
        const fontFamily = heading ? getComputedStyle(heading).fontFamily : '';
        const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewport.width;
        const visibleEmptyStates = [...document.querySelectorAll('.archive-empty')].filter((node) => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
        const archiveCards = document.querySelectorAll('.category-lead, .category-card, .author-lead, .author-card').length;
        return {
          hasHeading: Boolean(heading),
          fontSize,
          fontFamily,
          frameWidth: frame?.getBoundingClientRect().width ?? 0,
          headerHeight: header?.getBoundingClientRect().height ?? 0,
          hasFooter: Boolean(footer),
          hasMain: Boolean(main),
          missing,
          overflow,
          archiveCards,
          visibleEmptyStates,
        };
      }, { item, viewport });
      if (!observed.hasHeading) failures.push(`${item.name}/${viewport.name}: missing heading ${item.selector}`);
      const expectedFont = item[viewport.name];
      if (observed.fontSize == null || Math.abs(observed.fontSize - expectedFont) > 1.25) {
        failures.push(`${item.name}/${viewport.name}: heading ${observed.fontSize}px, expected ${expectedFont}px ±1.25`);
      }
      if (!/Plus Jakarta Sans/i.test(observed.fontFamily)) failures.push(`${item.name}/${viewport.name}: wrong heading font ${observed.fontFamily}`);
      const expectedFrameWidth = viewport.name === 'mobile' ? 358 : 1256;
      if (Math.abs(observed.frameWidth - expectedFrameWidth) > 1) failures.push(`${item.name}/${viewport.name}: frame ${observed.frameWidth}px, expected ${expectedFrameWidth}px ±1`);
      if (!observed.hasMain || !observed.hasFooter) failures.push(`${item.name}/${viewport.name}: missing main/footer shell`);
      if (observed.missing.length) failures.push(`${item.name}/${viewport.name}: missing required selectors ${observed.missing.join(', ')}`);
      if (viewport.name === 'mobile' && observed.overflow > 1) failures.push(`${item.name}/mobile: horizontal overflow ${observed.overflow}px`);
      const headerRange = viewport.name === 'mobile' ? [76, 82] : [86, 92];
      if (observed.headerHeight < headerRange[0] || observed.headerHeight > headerRange[1]) failures.push(`${item.name}/${viewport.name}: header ${observed.headerHeight}px outside ${headerRange.join('-')}px`);
      if ((item.name === 'category' || item.name === 'author') && !((observed.archiveCards > 0) !== (observed.visibleEmptyStates > 0))) {
        failures.push(`${item.name}/${viewport.name}: archive must show cards XOR one empty state`);
      }
      if (item.name === 'contact') {
        const contact = await page.evaluate(() => {
          const eyebrow = document.querySelector('.ffn-demo-contact .ph-k');
          const accent = document.querySelector('.ffn-demo-contact .ph h1 span');
          return {
            eyebrowMarker: eyebrow ? getComputedStyle(eyebrow, '::before').content.replace(/["']/g, '') : '',
            accentText: accent?.textContent?.trim() || '',
            accentColor: accent ? getComputedStyle(accent).color : '',
          };
        });
        if (contact.eyebrowMarker !== '●') failures.push(`${item.name}/${viewport.name}: missing authoritative eyebrow marker`);
        if (contact.accentText.toLowerCase() !== 'the newsroom.') failures.push(`${item.name}/${viewport.name}: accent text ${JSON.stringify(contact.accentText)}, expected "the newsroom."`);
        if (contact.accentColor !== 'rgb(79, 122, 0)') failures.push(`${item.name}/${viewport.name}: accent color ${contact.accentColor}, expected rgb(79, 122, 0)`);
      }
      if (item.name === 'article' && viewport.name === 'desktop') {
        const sticky = await page.evaluate(async () => {
          const rail = document.querySelector('.rl');
          const article = document.querySelector('.pr');
          if (!rail || !article) return null;
          article.style.minHeight = `${rail.getBoundingClientRect().height + 1600}px`;
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          const style = getComputedStyle(rail);
          const before = rail.getBoundingClientRect().top;
          const target = article.getBoundingClientRect().top + scrollY + 700;
          scrollTo(0, target);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const after = rail.getBoundingClientRect().top;
          return { position: style.position, top: style.top, before, after, scrollY };
        });
        if (!sticky) failures.push(`${item.name}/desktop: missing article rail`);
        else {
          if (sticky.position !== 'sticky') failures.push(`${item.name}/desktop: rail position ${sticky.position}, expected sticky`);
          if (Math.abs(sticky.after - 26) > 1.5) failures.push(`${item.name}/desktop: rail top after ${sticky.scrollY}px scroll is ${sticky.after}px, expected 26px ±1.5`);
        }
      }
      results.push({ route: item.name, viewport: viewport.name, status: response.status(), ...observed });
    }
    await page.close();
  }

  const baseline = readFileSync(contactBaselineUrl);
  const baselineHash = createHash('sha256').update(baseline).digest('hex');
  if (baselineHash !== expectedContactBaselineHash) failures.push(`contact/visual: authoritative baseline hash ${baselineHash}, expected ${expectedContactBaselineHash}`);

  const visualPage = await browser.newPage({ viewport: { width: 1408, height: 900 }, deviceScaleFactor: 1 });
  await visualPage.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
  if (mutation === 'contact-accent') await visualPage.evaluate(() => document.querySelector('.ffn-demo-contact .ph h1 span')?.remove());
  const geometry = await visualPage.evaluate(() => {
    const section = document.querySelector('.ffn-demo-contact .ph').getBoundingClientRect();
    const panel = document.querySelector('.ffn-demo-contact .ph > .w').getBoundingClientRect();
    const heading = document.querySelector('.ffn-demo-contact .ph h1');
    const style = getComputedStyle(heading);
    return { x: panel.x, y: panel.y - section.y, width: panel.width, height: panel.height, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
  });
  const geometryExpected = { x: 76, y: 28, width: 1256, height: 478.9375, fontSize: 96, lineHeight: 94.08 };
  for (const [key, expected] of Object.entries(geometryExpected)) {
    if (Math.abs(geometry[key] - expected) > 0.75) failures.push(`contact/visual: ${key} ${geometry[key]}, expected ${expected} ±0.75`);
  }
  const actual = await visualPage.locator('.ffn-demo-contact .ph').screenshot();
  await visualPage.close();
  const expectedRaw = await sharp(baseline).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const actualRaw = await sharp(actual).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (expectedRaw.info.width !== actualRaw.info.width || expectedRaw.info.height !== actualRaw.info.height) {
    failures.push(`contact/visual: screenshot dimensions ${actualRaw.info.width}x${actualRaw.info.height}, expected ${expectedRaw.info.width}x${expectedRaw.info.height}`);
  } else {
    let difference = 0;
    for (let index = 0; index < expectedRaw.data.length; index += 1) difference += Math.abs(expectedRaw.data[index] - actualRaw.data[index]);
    visual.contactMae = difference / expectedRaw.data.length;
    if (visual.contactMae > 3) failures.push(`contact/visual: mean pixel error ${visual.contactMae.toFixed(4)}, expected <= 3`);
  }
  visual.contactBaselineHash = baselineHash;
  visual.contactGeometry = geometry;
} finally {
  await browser.close();
}

console.log(JSON.stringify({ base, routes: cases.length, checks: results.length, failures, visual, results }, null, 2));
if (failures.length) process.exit(1);
console.log('ASTRO_DEMO_LOCK_OK true');
