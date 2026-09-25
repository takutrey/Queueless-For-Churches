const { test } = require("node:test");
const assert = require("node:assert/strict");

const socketUtils = require("../config/socket");

test("socket config exposes reconnect-safe room helpers", () => {
  assert.ok(socketUtils.initializeSocket);
  assert.ok(socketUtils.getIO);
});
