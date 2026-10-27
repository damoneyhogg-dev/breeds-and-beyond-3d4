const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('breedBeyond3D.v3', JSON.stringify({
    version: 3, parent: 'morgan', dog: null, stage: 'shop', day: 1, ageDays: 70,
    coins: 250, energy: 85, health: 90, bond: 20, skill: 5, scent: 5,
    fed: false, played: false, trained: false, ribbons: 0, scentDone: false,
    agilityDone: false, daycareDone: false, position: { x: 44, z: 13 }, location: 'town',
  })));
  await page.goto('file:///' + path.resolve(__dirname, '../play-3d.html').replaceAll('\\', '/'));
  await page.locator('#start').click();
  await page.locator('#quality').click();
  const canvas = page.locator('#world canvas');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .12, bounds.y + bounds.height * .5, { steps: 12 });
  await page.mouse.up();
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(700);
    samples.push(await page.evaluate(() => BreedWorld.snapshot().yardDog));
  }
  for (const dog of samples) {
    assert(dog.x >= dog.bounds.minX && dog.x <= dog.bounds.maxX);
    assert(dog.z >= dog.bounds.minZ && dog.z <= dog.bounds.maxZ);
  }
  assert(Math.hypot(samples.at(-1).x - samples[0].x, samples.at(-1).z - samples[0].z) > .3);
  await page.screenshot({ path: path.resolve(__dirname, '../qa-yard.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: fictional yard dog roams inside bounds; yard view captured');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
