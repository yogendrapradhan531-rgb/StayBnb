import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountInWords, financialYear, formatINR, numberToIndianWords } from '../src/utils/indianFormat.js';

test('numbers in words use the Indian system (lakh, crore)', () => {
  assert.equal(numberToIndianWords(124500), 'One Lakh Twenty-Four Thousand Five Hundred');
  assert.equal(numberToIndianWords(10000000), 'One Crore');
  assert.equal(numberToIndianWords(23456789), 'Two Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine');
});

test('amount in words includes paise', () => {
  assert.equal(amountInWords(24076.2), 'Rupees Twenty-Four Thousand Seventy-Six and Twenty Paise Only');
  assert.equal(amountInWords(1000), 'Rupees One Thousand Only');
});

test('financial year runs April to March', () => {
  assert.equal(financialYear(new Date(2026, 9, 2)), '2026-27');
  assert.equal(financialYear(new Date(2027, 2, 31)), '2026-27');
  assert.equal(financialYear(new Date(2027, 3, 1)), '2027-28');
});

test('₹ formatting uses Indian digit grouping', () => {
  assert.equal(formatINR(124500), '₹1,24,500.00');
});
