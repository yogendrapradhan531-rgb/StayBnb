// Day 7: hosts can set a minimum number of nights per booking
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSchema } from '../src/validation/validate.js';
import { listingSchema } from '../src/validation/schemas.js';

const check = (minNights) => runSchema({ minNights }, { minNights: listingSchema.minNights });

test('accepts a sensible minimum stay', () => {
  assert.equal(check(1), null);
  assert.equal(check(3), null);
  assert.equal(check(undefined), null); // optional – defaults to 1 night
});

test('rejects invalid minimum stays with clear messages', () => {
  assert.match(check(0).minNights, /at least 1 night/);
  assert.match(check(45).minNights, /at most 30 nights/);
  assert.match(check(2.5).minNights, /whole number/);
});