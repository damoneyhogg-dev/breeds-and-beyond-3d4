const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    globalThis.__pads = [{ id: 'QA Standard Gamepad', mapping: 'standard', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }];
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => globalThis.__pads });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file:///' + path.resolve(__dirname, '../play-3d.html').replaceAll('\\', '/'));
  await page.locator('#start').click();
  const snapshot = () => page.evaluate(() => BreedWorld.snapshot());
  const setPad = (axes, buttons = {}) => page.evaluate(({ axes, buttons }) => {
    const pad = globalThis.__pads[0];
    pad.axes.splice(0, pad.axes.length, ...axes);
    pad.buttons.forEach((button, index) => { button.pressed = !!buttons[index]; button.value = button.pressed ? 1 : 0; });
  }, { axes, buttons });

  let before = await snapshot();
  await setPad([.08, -.08, 0, 0]);
  await page.waitForTimeout(450);
  let after = await snapshot();
  assert(Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z) < .03, 'dead-zone drift is rejected');

  await setPad([0, -.42, 0, 0]);
  before = await snapshot();
  await page.waitForFunction(() => { const speed = BreedWorld.snapshot().controller.speed; return speed > .2 && speed < 1.4; }, {}, { timeout: 5000 });
  after = await snapshot();
  const slowDistance = Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z);
  assert(after.controller.speed > .2 && after.controller.speed < 1.4, `partial stick produces a slow analog walk (${after.controller.speed.toFixed(3)}m/s)`);

  await setPad([0, -1, 0, 0]);
  before = await snapshot();
  await page.waitForFunction(() => BreedWorld.snapshot().controller.speed > 2.2, {}, { timeout: 5000 });
  after = await snapshot();
  const fullDistance = Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z);
  assert(after.controller.speed > 2.2, 'full stick produces faster movement');

  await setPad([0, -1, 0, 0], { 10: true });
  await page.waitForFunction(() => BreedWorld.snapshot().controller.speed > 4.1, {}, { timeout: 5000 });
  assert.equal((await snapshot()).controller.state, 'run', 'left-stick click blends into run state');
  await setPad([0, 0, 0, 0]);

  await setPad([.707, -.707, 0, 0]);
  await page.waitForTimeout(500);
  after = await snapshot();
  assert(after.controller.speed <= 3.05, 'diagonal movement is normalized');

  await setPad([0, 0, 1, 0]);
  const yawBefore = (await snapshot()).controller.yaw;
  await page.waitForFunction(start => Math.abs(BreedWorld.snapshot().controller.yaw - start) > .2, yawBefore, { timeout: 5000 });
  const yawMoved = (await snapshot()).controller.yaw;
  assert(Math.abs(yawMoved - yawBefore) > .2, 'right stick orbits camera');
  await setPad([0, 0, 0, 0]);
  await page.waitForTimeout(200);
  const yawReleased = (await snapshot()).controller.yaw;
  await page.waitForTimeout(350);
  const yawSettled = (await snapshot()).controller.yaw;
  assert(Math.abs(yawSettled - yawReleased) < .03, 'camera stops after stick release');

  await page.keyboard.down('d');
  await page.waitForTimeout(300);
  await page.keyboard.up('d');
  assert.equal((await snapshot()).controller.input, 'keyboard', 'keyboard seamlessly becomes active input');

  await setPad([0, 0, 0, 0], { 9: true });
  await page.waitForTimeout(60);
  await setPad([0, 0, 0, 0]);
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#pause').textContent(), 'Resume', 'controller pause action works');

  await page.evaluate(() => { globalThis.__pads = []; });
  await page.waitForTimeout(100);
  assert.equal((await snapshot()).controller.connected, false, 'controller disconnect is handled');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: analog gamepad, dead zone, normalized diagonal, camera release, switching, pause, disconnect');
})().catch(error => { console.error(error); process.exit(1); });
