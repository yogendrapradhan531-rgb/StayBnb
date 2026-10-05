// Day 5: hosts shouldn't be able to put phone numbers in listing descriptions
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsPhoneNumber } from '../src/validation/india.js';
import { runSchema } from '../src/validation/validate.js';
import { listingSchema } from '../src/validation/schemas.js';

test('finds phone numbers written in different ways', () => {
  assert.equal(containsPhoneNumber('Call me on 9876543210 for a discount'), true);
  assert.equal(containsPhoneNumber('WhatsApp +91 98765 43210'), true);
  assert.equal(containsPhoneNumber('Phone: 98765-43210'), true);
  assert.equal(containsPhoneNumber('Landline (080) 2345 6789'), true);
});

test('does not block normal numbers in a description', () => {
  assert.equal(containsPhoneNumber('Only ₹2500 a night, 2 bedrooms, sleeps 4'), false);
  assert.equal(containsPhoneNumber('Agumbe 577411, 1800 m from Sunset Point'), false);
  assert.equal(containsPhoneNumber('Open 2024 – renovated in 2025'), false);
});

test('listing schema rejects a description with a phone number', () => {
  const errors = runSchema(
    { description: 'Lovely homestay near the falls. Book directly by calling 9876543210 for a cheaper rate!' },
    { description: listingSchema.description }
  );
  assert.match(errors.description, /remove the phone number/);
});