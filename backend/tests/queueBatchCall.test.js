const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseQueueCallRange } = require("../controllers/queueController");

test("parses a ticket range from A0001 to A0005", () => {
  const parsed = parseQueueCallRange({ range: "A0001-A0005" });

  assert.equal(parsed.kind, "batch");
  assert.deepEqual(parsed.queueNumbers, [1, 2, 3, 4, 5]);
});

test("parses explicit numeric ranges for batch calls", () => {
  const parsed = parseQueueCallRange({ fromNumber: 2, toNumber: 4 });

  assert.equal(parsed.kind, "batch");
  assert.deepEqual(parsed.queueNumbers, [2, 3, 4]);
});

test("keeps single-customer calls untouched when no range is provided", () => {
  const parsed = parseQueueCallRange({ entryId: "entry-123" });

  assert.equal(parsed.kind, "single");
  assert.equal(parsed.entryId, "entry-123");
});
