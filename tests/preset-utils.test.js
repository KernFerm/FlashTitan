const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");
const https = require("https");

const { getPresets, getPresetWithChecksum } = require("../preset-utils");

test("getPresets returns the official preset catalog", () => {
  const presets = getPresets();

  assert.ok(Array.isArray(presets));
  assert.ok(presets.length >= 4);
  assert.ok(presets.some((preset) => preset.id === "ubuntu-desktop"));
  const ubuntu = presets.find((preset) => preset.id === "ubuntu-desktop");
  assert.equal(ubuntu.sourceType, "direct-download");
  assert.equal(ubuntu.hasChecksum, true);
  assert.match(ubuntu.metadataFingerprint, /^[a-f0-9]{64}$/);
});

test("getPresetWithChecksum returns non-checksummed presets unchanged", async () => {
  const preset = await getPresetWithChecksum("windows-download");

  assert.equal(preset.id, "windows-download");
  assert.equal(preset.externalOnly, true);
  assert.equal(preset.expectedChecksum, undefined);
});

test("getPresetWithChecksum extracts expected checksum from manifest", async () => {
  const originalGet = https.get;
  const fakeChecksum = "a".repeat(64);

  https.get = (parsedUrl, callback) => {
    const response = new PassThrough();
    response.statusCode = 200;
    response.headers = {};
    response.setEncoding = () => {};

    process.nextTick(() => {
      callback(response);
      response.emit(
        "data",
        `${fakeChecksum} *ubuntu-24.04.2-desktop-amd64.iso\n${"b".repeat(64)} *other-file.iso\n`
      );
      response.emit("end");
    });

    const request = new EventEmitter();
    request.on = request.addListener.bind(request);
    return request;
  };

  try {
    const preset = await getPresetWithChecksum("ubuntu-desktop");
    assert.equal(preset.expectedChecksum, fakeChecksum);
    assert.equal(preset.hasChecksum, true);
  } finally {
    https.get = originalGet;
  }
});
