(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BreedMarketplace = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const allowedHosts = new Set(['www.chewy.com', 'www.thefarmersdog.com', 'www.petsmart.com']);
  const retailers = [
    { id: 'chewy', name: 'Chewy', category: 'Food, toys, beds, grooming and care supplies', url: 'https://www.chewy.com/b/dog-288', affiliateStatus: 'application-pending' },
    { id: 'farmers-dog', name: "The Farmer's Dog", category: 'Fresh-food plan information', url: 'https://www.thefarmersdog.com/', affiliateStatus: 'application-pending' },
    { id: 'petsmart', name: 'PetSmart', category: 'Food, training, grooming and everyday supplies', url: 'https://www.petsmart.com/dog/', affiliateStatus: 'application-pending' }
  ];
  function safeRetailer(id) {
    const item = retailers.find(entry => entry.id === id);
    if (!item) return null;
    try {
      const parsed = new URL(item.url);
      if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) return null;
      return { ...item };
    } catch (_) { return null; }
  }
  function disclosure(item) {
    return item.affiliateStatus === 'approved'
      ? 'Affiliate link: Breed & Beyond may earn a commission at no extra cost to you.'
      : 'Official retailer link. Affiliate tracking is not active yet.';
  }
  return { retailers: retailers.map(item => ({ ...item })), safeRetailer, disclosure };
});
