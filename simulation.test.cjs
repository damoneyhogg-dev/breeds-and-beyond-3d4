const test = require('node:test');
const assert = require('node:assert/strict');
const sim = require('./simulation.js');
function home() { const s = sim.createState(); sim.adopt(s, 'coco'); return s; }
test('setup cannot be bypassed and adopting twice cannot spend or replace', () => {
  const s = sim.createState(); const before = JSON.stringify(s);
  assert.equal(sim.interact(s, 'scentWin').ok, false);
  assert.equal(sim.nextDay(s).ok, false); assert.equal(JSON.stringify(s), before);
  assert.equal(sim.adopt(s, 'unknown').ok, false);
  assert.equal(sim.chooseParent(s, 'samira').ok, true);
  assert.equal(sim.adopt(s, 'coco').ok, true); assert.equal(s.coins, 170);
  assert.equal(sim.adopt(s, 'nova').ok, false); assert.equal(s.dog, 'coco');
  assert.equal(sim.chooseParent(s, 'morgan').ok, false);
});
test('care gates growth and growth resets daily opportunities', () => {
  const s = home(); assert.equal(sim.nextDay(s).ok, false);
  sim.interact(s, 'feed'); assert.equal(sim.nextDay(s).ok, false);
  sim.interact(s, 'play'); sim.interact(s, 'train');
  assert.equal(sim.nextDay(s).ok, true); assert.equal(s.ageDays, 84);
  assert.equal(s.day, 2); assert.equal(s.fed, false); assert.equal(s.trained, false);
});
test('event rewards require readiness, adulthood and cannot be farmed', () => {
  const s = home(); assert.equal(sim.interact(s, 'agilityWin').ok, false);
  s.energy = 20; assert.equal(sim.interact(s, 'scentWin').ok, false);
  s.energy = 85; s.health = 40; assert.equal(sim.interact(s, 'scentWin').ok, false);
  s.health = 90; assert.equal(sim.interact(s, 'scentWin').ok, true);
  const coins = s.coins; assert.equal(sim.interact(s, 'scentWin').ok, false);
  assert.equal(s.coins, coins); assert.equal(s.energy, 70);
  s.ageDays = 365; assert.equal(sim.interact(s, 'agilityWin').ok, false);
  s.skill = 25; assert.equal(sim.interact(s, 'agilityWin').ok, true);
});
test('parent effects and repeat-care guards have real impact', () => {
  const a = home(); const b = home(); b.parent = 'samira';
  sim.interact(a, 'train'); sim.interact(b, 'train'); assert.ok(b.skill > a.skill);
  const old = b.skill; assert.equal(sim.interact(b, 'train').ok, false); assert.equal(b.skill, old);
  a.coins = 0; assert.equal(sim.interact(a, 'vet').ok, false);
  assert.equal(sim.interact(a, 'feed').ok, true); assert.equal(sim.interact(a, 'rest').ok, true);
});
test('roundtrip preserves state and exclusively uses the new key', () => {
  const data = new Map([['breedBeyondSave', 'legacy untouched']]);
  const storage = { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) };
  const s = home(); sim.interact(s, 'feed'); sim.interact(s, 'scentWin');
  assert.equal(sim.save(storage, s), true); assert.deepEqual(sim.load(storage), s);
  assert.equal(data.get('breedBeyondSave'), 'legacy untouched');
  assert.equal(sim.interact(sim.load(storage), 'scentWin').ok, false);
});
test('corruption, wrong field types and inaccessible storage recover safely', () => {
  const load = raw => sim.load({ getItem: () => raw });
  for (const raw of ['{bad', 'null', '[]', '123']) assert.deepEqual(load(raw), sim.createState());
  for (const [key,value] of [['coins', '10'], ['fed', 1], ['parent', 'evil'], ['stage', 'adult'], ['location','evil'], ['health',101], ['position',null]]) {
    const s = home(); s[key] = value; assert.deepEqual(load(JSON.stringify(s)), sim.createState());
  }
  const broken = { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } };
  assert.deepEqual(sim.load(broken), sim.createState()); assert.equal(sim.save(broken,home()),false);
  assert.equal(sim.save(null, home()), false);
});
