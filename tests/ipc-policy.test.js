const test = require("node:test");
const assert = require("node:assert/strict");

const { VALID_CHANNELS, sanitizePayload } = require("../ipc-policy");

test("ipc policy keeps a narrow allowlist for privileged channels", () => {
  assert.ok(VALID_CHANNELS.has("flash:start"));
  assert.ok(VALID_CHANNELS.has("devices:list"));
  assert.ok(!VALID_CHANNELS.has("shell:arbitrary"));
  assert.ok(!VALID_CHANNELS.has("fs:write-anything"));
});

test("sanitizePayload strips control characters and trims object breadth", () => {
  const payload = sanitizePayload({
    "bad\u0000key": "hello\u0007world",
    nested: ["ok\u0001", true]
  });

  assert.equal(payload.badkey, "helloworld");
  assert.deepEqual(payload.nested, ["ok", true]);
});
