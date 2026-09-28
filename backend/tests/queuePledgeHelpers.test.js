const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePhone,
  getMatchStatus,
} = require("../utils/queuePledgeHelpers");

test("normalizes common phone punctuation and local numbers", () => {
  assert.equal(normalizePhone("077 123-4567", "263"), "263771234567");
  assert.equal(normalizePhone("+263 (77) 123-4567", "263"), "263771234567");
  assert.equal(normalizePhone(null, "263"), null);
});

test("matches a locally entered queue phone with a normalized pledge phone", () => {
  const queuePhone = normalizePhone("077 123 4567", "263");
  const pledgePhone = normalizePhone("+263771234567", "263");
  assert.equal(queuePhone, pledgePhone);
});

test("leaves a local number unchanged only when explicitly configured without a country code", () => {
  assert.equal(normalizePhone("077 123 4567", ""), "0771234567");
});

test("selects a pledge match status for zero, one, or many matches", () => {
  assert.equal(getMatchStatus([]), "NO_MATCH");
  assert.equal(getMatchStatus([{}]), "SINGLE_MATCH");
  assert.equal(getMatchStatus([{}, {}]), "MULTIPLE_MATCHES");
});
