(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BreedSim = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const KEY = 'breedBeyond3D.v3';
  const dogs = ['coco', 'atlas', 'nova'];
  const parents = ['morgan', 'jaylen', 'samira', 'devon'];
  const result = (ok, message) => ({ ok, message });
  const clamp = n => Math.max(0, Math.min(100, n));
  function createState() {
    return { version: 3, parent: 'morgan', dog: null, stage: 'shop', day: 1,
      ageDays: 70, coins: 250, energy: 85, health: 90, bond: 20, skill: 5,
      scent: 5, fed: false, played: false, trained: false, ribbons: 0,
      scentDone: false, agilityDone: false, daycareDone: false, position: { x: 0, z: 18 }, location: 'town' };
  }
  function valid(s) {
    if (!s || typeof s !== 'object' || s.version !== 3 || !parents.includes(s.parent) ||
      !(s.dog === null || dogs.includes(s.dog)) || !['shop', 'home'].includes(s.stage) ||
      (s.stage === 'home') !== (s.dog !== null) || typeof s.location !== 'string' ||
      !['town', 'shop', 'home', 'clinic', 'daycare', 'training', 'park'].includes(s.location)) return false;
    for (const key of ['energy', 'health', 'bond', 'skill', 'scent']) {
      if (!Number.isFinite(s[key]) || s[key] < 0 || s[key] > 100) return false;
    }
    for (const key of ['day', 'ageDays', 'coins', 'ribbons']) {
      if (!Number.isSafeInteger(s[key]) || s[key] < (key === 'day' ? 1 : 0) || s[key] > 10000000) return false;
    }
    for (const key of ['fed', 'played', 'trained', 'scentDone', 'agilityDone', 'daycareDone']) {
      if (typeof s[key] !== 'boolean') return false;
    }
    return !!s.position && ['x', 'z'].every(k => Number.isFinite(s.position[k]) && Math.abs(s.position[k]) <= 10000);
  }
  function load(storage) {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return createState();
      const parsed = JSON.parse(raw);
      if (parsed && parsed.daycareDone === undefined) parsed.daycareDone = false;
      if (!valid(parsed)) return createState();
      // Copy only known fields; never carry untrusted properties into runtime state.
      const state = createState();
      for (const key of Object.keys(state)) if (key !== 'position') state[key] = parsed[key];
      state.position = { x: parsed.position.x, z: parsed.position.z };
      return state;
    } catch (_) { return createState(); }
  }
  function save(storage, state) {
    try { if (!valid(state)) return false; storage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_) { return false; }
  }
  function chooseParent(state, id) {
    if (!parents.includes(id)) return result(false, 'Choose one of the four pet parents.');
    if (state.dog) return result(false, 'Your household is already chosen for this journey.');
    state.parent = id;
    return result(true, 'Pet parent selected. Meet Rene and choose your puppy.');
  }
  function adopt(state, dogId) {
    if (!dogs.includes(dogId)) return result(false, 'Choose Coco, Atlas, or Nova.');
    if (state.dog) return result(false, 'Your puppy is already part of your household.');
    if (state.coins < 80) return result(false, 'You need 80 coins for the puppy starter package.');
    state.coins -= 80; state.dog = dogId; state.stage = 'home';
    return result(true, 'Welcome to the family! Walk home together to feed, play, and train.');
  }
  function interact(state, action) {
    if (!state.dog || state.stage !== 'home') return result(false, 'Meet Rene at the pet shop and choose your puppy first.');
    const bonding = state.parent === 'morgan' ? 2 : 0;
    switch (action) {
      case 'feed':
        if (state.fed) return result(false, 'Your puppy has eaten today. Fresh water is always available.');
        state.fed = true; state.energy = clamp(state.energy + 10); state.health = clamp(state.health + 3);
        state.bond = clamp(state.bond + 2 + bonding);
        return result(true, 'Served a balanced puppy meal and fresh water. Meals are included with home supplies.');
      case 'rest':
        state.energy = clamp(state.energy + 30);
        return result(true, 'A quiet rest restores energy.');
      case 'play':
        if (state.played) return result(false, 'Playtime is complete for today. Let your puppy settle.');
        if (state.energy < 15 || state.health < 40) return result(false, 'Rest or visit Rene before active play.');
        state.played = true; state.energy -= 10; state.bond = clamp(state.bond + 8 + bonding);
        return result(true, 'A gentle play session builds trust.');
      case 'train':
        if (state.trained) return result(false, 'Training is complete today. Short sessions work best.');
        if (state.energy < 25 || state.health < 50) return result(false, 'Your puppy needs rest or care before training.');
        state.trained = true; state.energy -= state.parent === 'jaylen' ? 10 : 15;
        state.skill = clamp(state.skill + (state.parent === 'samira' ? 9 : 7));
        state.scent = clamp(state.scent + 5); state.bond = clamp(state.bond + 3);
        return result(true, 'Reward-based recall and scent practice completed.');
      case 'vet':
        if (state.coins < 15) return result(false, 'A routine clinic visit costs 15 coins. Rest and free home care remain available.');
        state.coins -= 15; state.health = clamp(state.health + (state.parent === 'devon' ? 35 : 25));
        return result(true, 'Rene completed a fictional wellness visit. Real injuries or diet concerns require a veterinarian; this game does not diagnose or prescribe.');
      case 'daycare':
        if (state.location !== 'daycare') return result(false, 'Visit the supervised daycare area first.');
        if (state.daycareDone) return result(false, 'Daycare is complete today. Return next chapter.');
        if (state.health < 60 || state.energy < 20) return result(false, 'Rest or visit Rene before daycare play.');
        if (state.coins < 10) return result(false, 'Daycare costs 10 coins. Home rest is free.');
        state.daycareDone = true; state.coins -= 10; state.energy = clamp(state.energy + 20); state.bond = clamp(state.bond + 3);
        return result(true, 'Supervised play and a quiet nap at daycare completed.');
      case 'scentWin': case 'agilityWin': {
        const agility = action === 'agilityWin';
        const flag = agility ? 'agilityDone' : 'scentDone';
        if (state[flag]) return result(false, 'This event reward has already been earned today.');
        if (agility && state.ageDays < 365) return result(false, 'The adult agility event unlocks at one year. Enjoy gentle scent searches while growing.');
        if (state.energy < 30 || state.health < 60) return result(false, 'Rest and recover before entering an event.');
        if (agility && state.skill < 25) return result(false, 'Train to skill 25 before adult agility.');
        state[flag] = true; state.energy -= agility ? 25 : 15;
        state.coins += agility ? 35 : 20; state.ribbons += 1;
        state.scent = clamp(state.scent + (agility ? 0 : 3));
        return result(true, agility ? 'Agility course complete! Earned 35 coins and a ribbon.' : 'Hidden article found! Earned 20 coins and a ribbon.');
      }
      default: return result(false, 'That activity is not available.');
    }
  }
  function nextDay(state) {
    if (!state.dog || !state.fed || !state.played) return result(false, 'Bring your puppy home, feed them, and share playtime before the next chapter.');
    state.day++; state.ageDays += 14; state.energy = 85;
    state.health = clamp(state.health + 2); state.coins += 10;
    for (const key of ['fed', 'played', 'trained', 'scentDone', 'agilityDone', 'daycareDone']) state[key] = false;
    return result(true, 'A new chapter begins: two weeks of growth, fresh activities, and 10 household coins.');
  }
  return { KEY, createState, load, save, chooseParent, adopt, interact, nextDay };
});
