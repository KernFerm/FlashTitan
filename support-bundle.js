const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { path7za } = require("7zip-bin");
const packageMetadata = require("./package.json");

function summarizeResult(lastResult) {
  if (!Array.isArray(lastResult)) {
    return [];
  }

  return lastResult.map((entry) => ({
    targetName: entry?.target?.name || "Unknown target",
    targetPath: entry?.target?.path || "",
    mode: entry?.result?.mode || "",
    verifyMode: entry?.result?.verifyMode || "",
    verificationReport: entry?.result?.verificationReport || null,
    targetRoot: entry?.result?.targetRoot || "",
    usedSplitImage: Boolean(entry?.result?.usedSplitImage),
    guidance: entry?.result?.guidance || "",
    classification: entry?.result?.classification
      ? {
          mode: entry.result.classification.mode,
          kind: entry.result.classification.kind,
          message: entry.result.classification.message,
          archiveType: entry.result.classification.prepared?.archiveType || null,
          extracted: Boolean(entry.result.classification.prepared?.extracted)
        }
      : null
  }));
}

async function createSupportBundle({ currentLogFilePath, settings, image, devices, lastResult }) {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "flashtitan-support-"));
  const manifestPath = path.join(tempRoot, "manifest.json");
  const bundlePath = path.join(tempRoot, "flashtitan-support-bundle.zip");

  const manifest = {
    createdAt: new Date().toISOString(),
    app: {
      name: packageMetadata.productName || packageMetadata.name || "FlashTitan",
      version: packageMetadata.version || "unknown"
    },
    runtime: {
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
      node: process.versions?.node || "unknown",
      electron: process.versions?.electron || "unknown"
    },
    settings,
    image: image
      ? {
          fileName: image.fileName,
          path: image.path,
          extension: image.extension,
          size: image.size,
          sizeLabel: image.sizeLabel,
          sha256: image.sha256,
          checksumMatch: image.checksumMatch,
          archivePreview: image.archivePreview || null,
          classification: image.classification
            ? {
                mode: image.classification.mode,
                kind: image.classification.kind,
                message: image.classification.message
              }
            : null
        }
      : null,
    devices,
    lastResultSummary: summarizeResult(lastResult),
    deviceSummary: Array.isArray(devices)
      ? devices.map((device) => ({
          id: device?.id || "",
          name: device?.name || "",
          path: device?.path || "",
          sizeLabel: device?.sizeLabel || "",
          mountPoints: Array.isArray(device?.mountPoints) ? device.mountPoints : [],
          warnings: Array.isArray(device?.warnings) ? device.warnings : []
        }))
      : [],
    logFilePath: currentLogFilePath
  };

  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  if (currentLogFilePath && fs.existsSync(currentLogFilePath)) {
    await fs.promises.copyFile(currentLogFilePath, path.join(tempRoot, path.basename(currentLogFilePath)));
  }

  await new Promise((resolve, reject) => {
    const child = spawn(path7za, ["a", "-tzip", bundlePath, path.join(tempRoot, "*")], {
      windowsHide: true
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Support bundle generation failed with exit code ${code}.`));
        return;
      }
      resolve();
    });
  });

  return bundlePath;
}

module.exports = {
  __test: {
    summarizeResult
  },
  createSupportBundle
};
