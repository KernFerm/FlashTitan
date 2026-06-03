const fs = require("fs");
const path = require("path");

const DEFAULT_SETTINGS = Object.freeze({
  experienceMode: "simple",
  verificationMode: "full",
  autoHash: true,
  advancedModeDefault: false,
  checksumPolicy: "optional",
  performanceProfile: "balanced",
  logRetentionDays: 14,
  downloadedImageDirectory: "",
  preferredChunkSizeMiB: 4
});

let settingsFilePath = null;

function initializeSettingsStore(baseDirectory) {
  settingsFilePath = path.join(baseDirectory, "settings.json");
}

function ensureInitialized() {
  if (!settingsFilePath) {
    throw new Error("Settings store has not been initialized.");
  }
}

function sanitizeSettings(input) {
  const next = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== "object") {
    return next;
  }

  if (["simple", "advanced"].includes(input.experienceMode)) {
    next.experienceMode = input.experienceMode;
  }
  if (["quick", "full"].includes(input.verificationMode)) {
    next.verificationMode = input.verificationMode;
  }
  next.autoHash = Boolean(input.autoHash);
  next.advancedModeDefault = Boolean(input.advancedModeDefault);
  if (["optional", "required"].includes(input.checksumPolicy)) {
    next.checksumPolicy = input.checksumPolicy;
  }
  if (["safe", "balanced", "fast"].includes(input.performanceProfile)) {
    next.performanceProfile = input.performanceProfile;
  }
  next.logRetentionDays = Math.max(1, Math.min(90, Number(input.logRetentionDays) || DEFAULT_SETTINGS.logRetentionDays));
  next.preferredChunkSizeMiB = Math.max(1, Math.min(32, Number(input.preferredChunkSizeMiB) || DEFAULT_SETTINGS.preferredChunkSizeMiB));
  if (typeof input.downloadedImageDirectory === "string") {
    next.downloadedImageDirectory = input.downloadedImageDirectory.slice(0, 260);
  }

  return next;
}

async function getSettings() {
  ensureInitialized();
  try {
    const raw = await fs.promises.readFile(settingsFilePath, "utf8");
    return sanitizeSettings(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }
}

async function saveSettings(partialSettings) {
  ensureInitialized();
  const merged = sanitizeSettings({
    ...(await getSettings()),
    ...(partialSettings || {})
  });
  await fs.promises.mkdir(path.dirname(settingsFilePath), { recursive: true });
  await fs.promises.writeFile(settingsFilePath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  initializeSettingsStore,
  saveSettings
};
