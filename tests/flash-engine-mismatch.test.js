const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../flash-engine");

test("extractMismatchOffset reads verification byte offsets", () => {
  assert.equal(__test.extractMismatchOffset("Verification failed at byte offset 1048576 because the device contents differ."), 1048576);
  assert.equal(__test.extractMismatchOffset("No offset here."), null);
});

test("normalizeOperationError keeps mismatch offsets in the user-facing message", () => {
  const error = __test.normalizeOperationError(
    new Error("Verification failed at byte offset 4096 because the device contents differ from the source image."),
    { targetName: "USB stick" }
  );

  assert.match(error.message, /USB stick/i);
  assert.match(error.message, /byte 4096/i);
});
