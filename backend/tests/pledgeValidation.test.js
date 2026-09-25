const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseAmount, parseQuantity } = require("../utils/pledgeHelpers");

test("rejects monetary pledges below 1.00", () => {
  assert.equal(parseAmount(0), null);
  assert.equal(parseAmount(0.1), null);
  assert.equal(parseAmount("0.99"), null);
  assert.equal(parseAmount("1"), "1.00");
  assert.equal(parseAmount("1.50"), "1.50");
});

test("rejects non-positive material quantities and accepts positive values", () => {
  assert.equal(parseQuantity(0), null);
  assert.equal(parseQuantity(-1), null);
  assert.equal(parseQuantity("0.00"), null);
  assert.equal(parseQuantity("0.1"), null);
  assert.equal(parseQuantity("1"), "1.000");
  assert.equal(parseQuantity("10.5"), "10.500");
});
