import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSchema } from '../src/validation/validate.js';
import { listingSchema, registerSchema, verificationSchema } from '../src/validation/schemas.js';
import { maskPan, normalizeMobile, MOBILE_RE, PIN_CODE_RE } from '../src/validation/india.js';

test('register: friendly, field-specific messages', () => {
  assert.deepEqual(runSchema({ name: 'R', email: 'bad', password: 'short' }, registerSchema), {
    name: 'Name should be at least 2 characters',
    email: 'That doesn’t look like a valid email – e.g. riya@gmail.com',
    password: 'Use at least 8 characters for your password',
  });
  assert.equal(runSchema({ name: 'Riya', email: 'riya@gmail.com', password: 'password123' }, registerSchema), null);
});

test('listing: Indian state, PIN code and map pin inside India', () => {
  const errors = runSchema(
    { address: { city: 'London', state: 'Greater London', pincode: '056003' }, location: { lat: 51.5, lng: -0.12 } },
    listingSchema
  );
  assert.equal(errors['address.state'], 'Choose a state or union territory from the list');
  assert.equal(errors['address.pincode'], 'PIN code must be 6 digits and can’t start with 0 – e.g. 560038');
  assert.equal(errors['location.lat'], 'That pin is outside India');
});

test('listing updates are validated partially', () => {
  assert.equal(runSchema({ isActive: false }, listingSchema, { partial: true }), null);
  assert.ok(runSchema({ pricePerNight: 99 }, listingSchema, { partial: true }).pricePerNight);
});

test('host verification accepts common Indian formats', () => {
  const ok = { legalName: 'Aarav Hegde', pan: 'abcde1234f', phone: '+91 98450 12345', aadhaarLast4: '1234', consent: true };
  assert.equal(runSchema(ok, verificationSchema), null);
  const bad = runSchema({ ...ok, pan: 'ABCD1234F', aadhaarLast4: '123456789012', consent: false }, verificationSchema);
  assert.deepEqual(Object.keys(bad).sort(), ['aadhaarLast4', 'consent', 'pan']);
});

test('India helpers', () => {
  assert.equal(maskPan('ABCDE1234F'), 'ABXXX1234F');
  for (const m of ['+91 98450 12345', '09845012345', '9845012345', '91-9845012345']) {
    assert.ok(MOBILE_RE.test(normalizeMobile(m)), m);
  }
  assert.ok(!MOBILE_RE.test(normalizeMobile('5845012345')));
  assert.ok(PIN_CODE_RE.test('560038') && !PIN_CODE_RE.test('060038'));
});
