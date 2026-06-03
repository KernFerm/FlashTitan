const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

const presetFilePath = path.join(__dirname, "iso-presets.json");

function stablePresetFingerprint(preset) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        id: preset.id,
        name: preset.name,
        vendor: preset.vendor,
        category: preset.category,
        downloadUrl: preset.downloadUrl,
        checksumUrl: preset.checksumUrl,
        checksumPattern: preset.checksumPattern,
        externalOnly: Boolean(preset.externalOnly)
      })
    )
    .digest("hex");
}

function enrichPreset(entry) {
  const preset = { ...entry };
  preset.sourceType = preset.externalOnly ? "vendor-page" : "direct-download";
  preset.hasChecksum = Boolean(preset.checksumUrl && preset.checksumPattern);
  preset.updatePolicy = preset.externalOnly ? "manual-vendor-page" : "pinned-direct-link";
  preset.metadataFingerprint = stablePresetFingerprint(preset);
  preset.maintainedBy = "FlashTitan preset catalog";
  return preset;
}

function getPresets() {
  const raw = fs.readFileSync(presetFilePath, "utf8");
  return JSON.parse(raw).map((entry) => enrichPreset(entry));
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    client
      .get(parsed, (response) => {
        if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume();
          resolve(fetchText(response.headers.location));
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch preset checksum manifest: HTTP ${response.statusCode}.`));
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function getPresetWithChecksum(id) {
  const preset = getPresets().find((entry) => entry.id === id);
  if (!preset) {
    throw new Error("Preset was not found.");
  }

  if (!preset.checksumUrl || !preset.checksumPattern) {
    return preset;
  }

  const manifest = await fetchText(preset.checksumUrl);
  const match = manifest.match(new RegExp(preset.checksumPattern));
  return {
    ...preset,
    expectedChecksum: match ? match[1].toLowerCase() : ""
  };
}

module.exports = {
  getPresetWithChecksum,
  getPresets
};
