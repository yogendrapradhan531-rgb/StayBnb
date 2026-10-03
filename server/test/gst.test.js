// Run with: npm test   (uses Node's built-in test runner – no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accommodationGstRate, calculateGst } from '../src/utils/gst.js';
import { calculatePrice } from '../src/utils/pricing.js';

test('GST slab follows the nightly tariff (Sep 2025 rates)', () => {
  assert.equal(accommodationGstRate(950), 0); // exempt
  assert.equal(accommodationGstRate(1000), 0);
  assert.equal(accommodationGstRate(1001), 5);
  assert.equal(accommodationGstRate(7500), 5);
  assert.equal(accommodationGstRate(7501), 18);
});

test('price breakdown for a 5% stay (Coorg cottage, 3 nights)', () => {
  const p = calculatePrice({ pricePerNight: 6500, cleaningFee: 800 }, 3);
  assert.equal(p.subtotal, 19500);
  assert.equal(p.serviceFee, 2340); // 12%
  assert.deepEqual(p.gst, {
    accommodationRate: 5,
    accommodation: 1015, // 5% of (19500 + 800)
    serviceFeeRate: 18,
    serviceFee: 421.2, // 18% of 2340
    cgst: 718.1,
    sgst: 718.1,
    total: 1436.2,
  });
  assert.equal(p.totalPrice, 24076.2);
});

test('18% slab above ₹7,500 and exempt stays only pay GST on the fee', () => {
  assert.equal(calculatePrice({ pricePerNight: 11800, cleaningFee: 1500 }, 2).gst.accommodationRate, 18);
  const budget = calculatePrice({ pricePerNight: 950, cleaningFee: 0 }, 2);
  assert.equal(budget.gst.accommodation, 0);
  assert.equal(budget.gst.serviceFee, 41.04); // 18% of 228
});

test('CGST + SGST always add up to the total, even with odd paise', () => {
  const g = calculateGst({ accommodationAmount: 1001, nightlyTariff: 1001, serviceFee: 0.05 });
  assert.equal(Math.round((g.cgst + g.sgst) * 100) / 100, g.total);
});
