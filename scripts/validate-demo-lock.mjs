#!/usr/bin/env node
import { chromium } from 'playwright';

const base = (process.env.TARGET_BASE || 'http://127.0.0.1:4406').replace(/\/$/, '');
const cases = [
  { name: 'homepage', path: '/', selector: '.lock-hero h1', frame: '.lock-hero', desktop: 120.96, mobile: 52, required: ['.lock-topic-grid', '.lock-about-panel', '.lock-story-grid', '.lock-commitment-panel', '.lock-process-panel', '.lock-team-grid'] },
  { name: 'about', path: '/about/', selector: '.about-hero h1', frame: '.about-hero-panel', desktop: 92.16, mobile: 44, required: ['.broader-image', '.purpose-panel', '.standards-grid', '.readers-grid', '.explore-section'] },
  { name: 'contact', path: '/contact/', selector: '.ffn-demo-contact h1', frame: '.ffn-demo-contact .ph > .w', desktop: 92.16, mobile: 44, required: ['.contact-guide', '.contact-form', 'form'] },
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
      results.push({ route: item.name, viewport: viewport.name, status: response.status(), ...observed });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ base, routes: cases.length, checks: results.length, failures, results }, null, 2));
if (failures.length) process.exit(1);
console.log('ASTRO_DEMO_LOCK_OK true');
