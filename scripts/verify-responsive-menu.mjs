import { chromium } from 'playwright';

const base = (process.env.TARGET_BASE || process.env.SITE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const mutation = process.env.RESPONSIVE_MENU_MUTATION || '';
const failures = [];
const results = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function state(page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-brand-header]');
    const button = header?.querySelector('[data-menu-toggle]');
    const nav = header?.querySelector('#primary-navigation');
    if (!(header instanceof HTMLElement) || !(button instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) {
      return { missing: true };
    }
    const buttonStyle = getComputedStyle(button);
    const navStyle = getComputedStyle(nav);
    const rect = nav.getBoundingClientRect();
    return {
      missing: false,
      expanded: button.getAttribute('aria-expanded'),
      controls: button.getAttribute('aria-controls'),
      buttonDisplay: buttonStyle.display,
      buttonVisible: buttonStyle.display !== 'none' && buttonStyle.visibility !== 'hidden' && button.getBoundingClientRect().width > 0,
      navDisplay: navStyle.display,
      navVisible: navStyle.display !== 'none' && navStyle.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
      navRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      linkCount: nav.querySelectorAll('a').length,
      activeIsButton: document.activeElement === button,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
}

for (const width of [1440, 1025]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const response = await page.goto(`${base}/?menu-proof=${width}-${Date.now()}`, { waitUntil: 'networkidle' });
  const current = await state(page);
  assert(response?.status() === 200, `${width}: HTTP ${response?.status()}`);
  assert(!current.missing, `${width}: header controls missing`);
  assert(!current.buttonVisible, `${width}: toggle should be hidden`);
  assert(current.navVisible, `${width}: desktop nav should be visible`);
  assert(current.linkCount > 0, `${width}: no CMS navigation links`);
  assert(!current.horizontalOverflow, `${width}: horizontal overflow`);
  results.push({ width, desktop: current });
  await page.close();
}

for (const width of [1024, 768, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const response = await page.goto(`${base}/?menu-proof=${width}-${Date.now()}`, { waitUntil: 'networkidle' });
  if (mutation === 'broken-aria-controls') await page.locator('[data-menu-toggle]').evaluate((node) => node.setAttribute('aria-controls', 'broken-navigation'));
  const button = page.locator('[data-menu-toggle]');
  const nav = page.locator('#primary-navigation');
  const closed = await state(page);
  assert(response?.status() === 200, `${width}: HTTP ${response?.status()}`);
  assert(closed.buttonVisible, `${width}: toggle should be visible`);
  assert(closed.expanded === 'false', `${width}: initial aria-expanded should be false`);
  assert(closed.controls === 'primary-navigation', `${width}: aria-controls mismatch`);
  assert(!closed.navVisible, `${width}: nav should initially be closed`);
  assert(closed.linkCount > 0, `${width}: no CMS navigation links`);

  await button.click();
  await page.waitForTimeout(250);
  const pointerOpen = await state(page);
  assert(pointerOpen.expanded === 'true', `${width}: pointer open did not set aria-expanded`);
  assert(pointerOpen.navVisible, `${width}: pointer open did not reveal nav`);
  assert(!pointerOpen.horizontalOverflow, `${width}: pointer-open overflow`);

  await page.keyboard.press('Escape');
  const escaped = await state(page);
  assert(escaped.expanded === 'false' && !escaped.navVisible, `${width}: Escape did not close nav`);
  assert(escaped.activeIsButton, `${width}: Escape did not return focus`);

  await button.press('Enter');
  const enterOpen = await state(page);
  assert(enterOpen.expanded === 'true' && enterOpen.navVisible, `${width}: Enter did not open nav`);
  await button.press('Space');
  const spaceClosed = await state(page);
  assert(spaceClosed.expanded === 'false' && !spaceClosed.navVisible, `${width}: Space did not close nav`);

  await button.click();
  await page.evaluate(() => document.querySelector('#primary-navigation a')?.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await nav.locator('a').first().click();
  const linkClosed = await state(page);
  assert(linkClosed.expanded === 'false' && !linkClosed.navVisible, `${width}: selecting a link did not close nav`);

  await button.click();
  await page.mouse.click(width - 5, 600);
  const outsideClosed = await state(page);
  assert(outsideClosed.expanded === 'false' && !outsideClosed.navVisible, `${width}: outside click did not close nav`);

  await button.click();
  await page.setViewportSize({ width: 1025, height: 900 });
  await page.waitForTimeout(100);
  const resized = await state(page);
  assert(resized.expanded === 'false', `${width}: desktop resize did not reset aria-expanded`);
  assert(!resized.buttonVisible && resized.navVisible, `${width}: desktop resize did not restore desktop nav`);
  assert(!resized.horizontalOverflow, `${width}: resized overflow`);

  results.push({ width, closed, pointerOpen, escaped, enterOpen, spaceClosed, linkClosed, outsideClosed, resized });
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(JSON.stringify({ base, failures, results }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ base, status: 'RESPONSIVE_MENU_OK', viewports: results.map((item) => item.width), links: results[0]?.desktop?.linkCount || 0 }, null, 2));
