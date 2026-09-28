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

test("leaves a local leading zero unchanged without configured country code", () => {
  assert.equal(normalizePhone("077 123 4567", ""), "0771234567");
});

test("selects a pledge match status for zero, one, or many matches", () => {
  assert.equal(getMatchStatus([]), "NO_MATCH");
  assert.equal(getMatchStatus([{}]), "SINGLE_MATCH");
  assert.equal(getMatchStatus([{}, {}]), "MULTIPLE_MATCHES");
});
