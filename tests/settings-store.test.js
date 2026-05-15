const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  DEFAULT_SETTINGS,
  getSettings,
  initializeSettingsStore,
  saveSettings
} = require("../settings-store");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "flashtitan-settings-"));
}

test("settings store returns defaults when no file exists", async () => {
  const tempDir = makeTempDir();
  initializeSettingsStore(tempDir);

  const settings = await getSettings();

  assert.deepEqual(settings, { ...DEFAULT_SETTINGS });
});

test("settings store sanitizes and persists supported values", async () => {
  const tempDir = makeTempDir();
  initializeSettingsStore(tempDir);

  const saved = await saveSettings({
    experienceMode: "advanced",
    verificationMode: "quick",
    checksumPolicy: "required",
    performanceProfile: "fast",
    autoHash: false,
    advancedModeDefault: true,
    preferredChunkSizeMiB: 999,
    logRetentionDays: -5,
    downloadedImageDirectory: "C:\\images"
  });

  assert.equal(saved.experienceMode, "advanced");
  assert.equal(saved.verificationMode, "quick");
  assert.equal(saved.checksumPolicy, "required");
  assert.equal(saved.performanceProfile, "fast");
  assert.equal(saved.autoHash, false);
  assert.equal(saved.advancedModeDefault, true);
  assert.equal(saved.preferredChunkSizeMiB, 32);
  assert.equal(saved.logRetentionDays, 1);
  assert.equal(saved.downloadedImageDirectory, "C:\\images");

  const reloaded = await getSettings();
  assert.deepEqual(reloaded, saved);
});
