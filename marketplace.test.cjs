const assert = require('node:assert/strict');
const market = require('./marketplace.js');

assert.equal(market.retailers.length, 3);
for (const entry of market.retailers) {
  const safe = market.safeRetailer(entry.id);
  assert.ok(safe, `${entry.name} should have a permitted link`);
  assert.equal(new URL(safe.url).protocol, 'https:');
  assert.match(market.disclosure(safe), /tracking is not active yet/i);
}
assert.equal(market.safeRetailer('unknown'), null);
assert.equal(market.retailers.some(entry => entry.affiliateStatus === 'approved'), false);
console.log('Marketplace configuration and retailer allowlist passed.');
