// My own GST tests – checks the Agumbe listing and the slab boundaries
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice } from '../src/utils/pricing.js';

test('Agumbe homestay: 2 nights at ₹1,800 + ₹200 cleaning', () => {
  const p = calculatePrice({ pricePerNight: 1800, cleaningFee: 200 }, 2);
  assert.equal(p.subtotal, 3600);
  assert.equal(p.serviceFee, 432);         // 12% of 3600
  assert.equal(p.gst.accommodationRate, 5); // ₹1,800/night is in the 5% slab
  assert.equal(p.gst.accommodation, 190);   // 5% of (3600 + 200)
  assert.equal(p.gst.serviceFee, 77.76);    // 18% of 432
  assert.equal(p.gst.cgst, 133.88);
  assert.equal(p.gst.sgst, 133.88);
  assert.equal(p.gst.total, 267.76);
  assert.equal(p.totalPrice, 4499.76);
});

test('₹1 more per night at the ₹7,500 boundary jumps from 5% to 18%', () => {
  const at = calculatePrice({ pricePerNight: 7500, cleaningFee: 0 }, 1);
  const above = calculatePrice({ pricePerNight: 7501, cleaningFee: 0 }, 1);
  assert.equal(at.gst.accommodation, 375);        // 5% of 7500
  assert.equal(above.gst.accommodation, 1350.18); // 18% of 7501
  assert.ok(above.totalPrice - at.totalPrice > 900); // guest pays ~₹975 more for ₹1!
});

test('decimal tariffs just above ₹1,000 are not exempt', () => {
  const p = calculatePrice({ pricePerNight: 1000.5, cleaningFee: 0 }, 1);
  assert.equal(p.gst.accommodationRate, 5);
});