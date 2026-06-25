const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../flash-engine");

test("normalizeOperationError gives friendlier cancellation cleanup guidance", () => {
  const error = __test.normalizeOperationError(new Error("Operation cancelled. Reconnect the media and re-run the flash if it is left in an unknown state."), {
    targetName: "Test USB"
  });

  assert.match(error.message, /stopped the job before it finished/i);
  assert.match(error.message, /format it in Windows/i);
});

test("normalizeOperationError explains Windows lock conflicts", () => {
  const error = __test.normalizeOperationError(new Error("The process cannot access the file because it is being used by another process."), {
    targetName: "Test USB"
  });

  assert.match(error.message, /would not give FlashTitan full access/i);
  assert.match(error.message, /File Explorer/i);
});

test("normalizeOperationError explains verification mismatches", () => {
  const error = __test.normalizeOperationError(new Error("Verification failed because the written device length does not match the source image."), {
    targetName: "Test USB"
  });

  assert.match(error.message, /did not match the source image/i);
  assert.match(error.message, /different USB port or removable drive/i);
});
