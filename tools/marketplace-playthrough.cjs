const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-unsafe-swiftshader']
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => { window.__openedRetailer = null; window.open = url => { window.__openedRetailer = url; return null; }; });
    await page.goto('file:///' + path.resolve(__dirname, '../index.html').replaceAll('\\', '/'));
    await page.locator('#start').click();
    await page.waitForFunction(() => BreedWorld.snapshot().renderer.triangles > 0);
    const before = await page.evaluate(() => BreedWorld.snapshot().state);
    await page.locator('#marketplace').click();
    assert.equal(await page.locator('[data-retailer]').count(), 3);
    assert.match(await page.locator('#panelBody').innerText(), /Affiliate tracking is not active yet/i);
    await page.locator('[data-retailer="chewy"]').click();
    assert.equal(await page.locator('#continuePurchase').isDisabled(), true);
    await page.locator('#adultConfirm').check();
    assert.equal(await page.locator('#continuePurchase').isEnabled(), true);
    await page.locator('#continuePurchase').click();
    assert.equal(await page.evaluate(() => window.__openedRetailer), 'https://www.chewy.com/b/dog-288');
    assert.deepEqual(await page.evaluate(() => BreedWorld.snapshot().state), before);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.resolve(__dirname, `../qa-marketplace-${viewport.width}.png`) });
    await page.close();
  }
  await browser.close();
  console.log('PASS: marketplace desktop/mobile flow, adult gate, allowlisted link and unchanged game state.');
})().catch(error => { console.error(error); process.exit(1); });
