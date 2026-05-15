const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { app, BrowserWindow, dialog, ipcMain, shell, session } = require("electron");
const drivelist = require("drivelist");
const { getWriterAvailability } = require("./flash-engine");
const { classifyImage, listWindowsDeviceMetadata } = require("./windows-media");
const { getSettings, initializeSettingsStore, saveSettings } = require("./settings-store");
const { appendLogEntry, getCurrentLogFilePath, initializeLogStore, pruneLogs } = require("./log-store");
const { downloadFile } = require("./download-utils");
const { startFlashHelper } = require("./helper-client");
const { createSupportBundle } = require("./support-bundle");
const { getPresetWithChecksum, getPresets } = require("./preset-utils");
const { previewArchiveContents } = require("./archive-utils");
const { buildDeviceRecord, validateDeviceSelection, validateDeviceSelections } = require("./device-safety");

const SUPPORTED_EXTENSIONS = new Set([".iso", ".img", ".zip", ".xz", ".gz"]);
const HASH_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_IPC_STRING_LENGTH = 4096;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const ALLOWED_EXTERNAL_URLS = new Set([
  "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-device-boot-mode"
]);
const BLOCKED_NETWORK_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:", "ftp:"]);

let mainWindow = null;
let currentOperation = null;
const ipcRateLimit = new Map();
let lastOperationContext = null;
const DEVICE_METADATA_TIMEOUT_MS = 1500;

function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/[\u0000-\u001f\u007f<>`"'\\]/g, "").trim().slice(0, 260);
}

function sanitizeInputString(value, maxLength = 260) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function validateChecksum(value) {
  const checksum = sanitizeInputString(value, 128).toLowerCase();
  if (!checksum) {
    return "";
  }

  if (!SHA256_PATTERN.test(checksum)) {
    throw new Error("Expected SHA256 checksums must be 64 hexadecimal characters.");
  }

  return checksum;
}

function normalizePath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0 || filePath.length > MAX_IPC_STRING_LENGTH) {
    throw new Error("A file path is required.");
  }

  const resolved = path.resolve(filePath);
  if (/[<>:"|?*\u0000-\u001f]/.test(resolved.replace(/^[A-Za-z]:\\/, ""))) {
    throw new Error("Path contains blocked characters.");
  }

  return resolved;
}

function isSuspiciousPath(filePath) {
  const lowered = filePath.toLowerCase();
  return lowered.includes("..") || lowered.startsWith("\\\\") || lowered.includes("\0");
}

function shouldBlockSessionRequest(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    return BLOCKED_NETWORK_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

async function writeAudit(entry) {
  try {
    await appendLogEntry(entry);
  } catch {
    // Keep logging best-effort so the app does not fail if the log file is unavailable.
  }
}

function sendOperationEvent(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  void writeAudit({
    scope: "event",
    payload
  });
  mainWindow.webContents.send("flash:event", payload);
}

async function listDevices() {
  const drives = await drivelist.list();
  let metadata = [];
  let metadataStatus = "loaded";

  try {
    metadata = await Promise.race([
      listWindowsDeviceMetadata(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timed out while loading Windows device metadata.")), DEVICE_METADATA_TIMEOUT_MS);
      })
    ]);
  } catch (error) {
    metadataStatus = error instanceof Error ? error.message : "metadata unavailable";
    metadata = [];
  }

  const metadataMap = new Map();

  for (const entry of metadata) {
    metadataMap.set(entry.path, entry);
    metadataMap.set(String(entry.number), entry);
  }

  const devices = drives.map((drive) => buildDeviceRecord(drive, metadataMap));
  const filtered = devices.filter((device) => device.removable && !device.system && !device.internal && !device.blocked);

  await writeAudit({
    scope: "devices-list",
    metadataStatus,
    rawDriveCount: drives.length,
    visibleDeviceCount: filtered.length,
    rawDrives: drives.map((drive) => ({
      device: drive.device || drive.raw || "",
      description: drive.description || "",
      busType: drive.busType || "",
      isRemovable: Boolean(drive.isRemovable),
      isSystem: Boolean(drive.isSystem),
      mountPoints: Array.isArray(drive.mountpoints) ? drive.mountpoints.map((item) => item.path || "") : []
    })),
    visibleDevices: filtered.map((device) => ({
      id: device.id,
      name: device.name,
      path: device.path,
      removable: device.removable,
      system: device.system,
      internal: device.internal,
      blocked: device.blocked,
      type: device.type,
      mountPoints: device.mountPoints
    }))
  });

  return filtered;
}

async function createHashStream(filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark: HASH_CHUNK_SIZE });
    let processed = 0;
    const startedAt = Date.now();

    stream.on("data", (chunk) => {
      processed += chunk.length;
      hash.update(chunk);
      if (typeof onProgress === "function") {
        onProgress(processed, startedAt);
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function validateImagePath(filePath, options = {}) {
  const normalizedPath = normalizePath(filePath);
  const sanitizedChecksum = validateChecksum(options.expectedChecksum || "");

  if (isSuspiciousPath(normalizedPath)) {
    throw new Error("Image path was rejected by the sanitization policy.");
  }

  const extension = path.extname(normalizedPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported image format.");
  }

  const stats = await fs.promises.stat(normalizedPath);
  if (!stats.isFile()) {
    throw new Error("The selected image is not a file.");
  }
  if (stats.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  let sha256 = null;
  if (options.computeHash) {
    sha256 = await createHashStream(normalizedPath, (processed, startedAt) => {
      sendOperationEvent({
        type: "hash-progress",
        stage: "hashing",
        processedBytes: processed,
        totalBytes: stats.size,
        speedBytesPerSecond: processed / Math.max((Date.now() - startedAt) / 1000, 0.001)
      });
    });
  }

  const checksumMatch = sanitizedChecksum
    ? sha256 && sha256.toLowerCase() === sanitizedChecksum
    : null;

  let archivePreview = null;
  if ([".zip", ".xz", ".gz"].includes(extension)) {
    try {
      archivePreview = await previewArchiveContents(normalizedPath);
    } catch (error) {
      archivePreview = {
        archiveType: extension,
        entryCount: 0,
        sampleEntries: [],
        flashableCandidates: [],
        error: error.message
      };
    }
  }

  let classification = null;
  if (options.deepInspect) {
    try {
      classification = await classifyImage(normalizedPath);
    } catch (error) {
      classification = {
        mode: "inspect-error",
        kind: "unknown",
        message: error.message
      };
    }
  }

  return {
    path: normalizedPath,
    fileName: path.basename(normalizedPath),
    extension,
    size: stats.size,
    sizeLabel: formatBytes(stats.size),
    sha256,
    checksumMatch,
    archivePreview,
    classification
  };
}

function buildRecoveryGuidance(message, targetCount) {
  const lowered = String(message || "").toLowerCase();
  if (lowered.includes("stopped the job before it finished")) {
    return "Retry steps: reconnect the drive, reformat it in Windows if it looks unreadable, then start the write again.";
  }
  if (lowered.includes("full access")) {
    return "Retry steps: close File Explorer, antivirus scans, backup tools, and any app using the drive, then reconnect and try again.";
  }
  if (lowered.includes("did not match the source image")) {
    return "Retry steps: try a different USB port or removable drive, then run the write again.";
  }
  if (lowered.includes("disconnected") || lowered.includes("unexpected state")) {
    return "Retry steps: unplug the drive, plug it back in, refresh the device list, and retry the write.";
  }
  if (lowered.includes("read-only")) {
    return "Retry steps: check for a hardware lock switch, reconnect the drive, and confirm Windows can write to it.";
  }
  if (lowered.includes("too small")) {
    return `Retry steps: choose a larger removable drive${targetCount > 1 ? " for every selected target" : ""}.`;
  }
  return "Retry steps: reconnect the removable drive, refresh the device list, and try again.";
}

function ensureTrustedSender(event) {
  const senderFrame = event.senderFrame;
  const senderUrl = senderFrame && typeof senderFrame.url === "string" ? senderFrame.url : "";
  const expectedUrl = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents.getURL() : "";

  if (!senderUrl || !expectedUrl || senderUrl !== expectedUrl) {
    throw new Error("Blocked IPC request from an untrusted renderer.");
  }
}

function enforceIpcRateLimit(event, channel) {
  const senderId = `${event.sender.id}:${channel}`;
  const now = Date.now();
  const existing = ipcRateLimit.get(senderId) || [];
  const recent = existing.filter((timestamp) => now - timestamp < 1000);

  if (recent.length >= 36) {
    throw new Error("Too many IPC requests. Please slow down.");
  }

  recent.push(now);
  ipcRateLimit.set(senderId, recent);
}

function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (event, payload) => {
    ensureTrustedSender(event);
    enforceIpcRateLimit(event, channel);
    return handler(event, payload);
  });
}

async function handleFlashStartRequest(payload) {
  try {
    const result = await beginFlash(payload || {});
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Flash operation failed.",
        code: "FLASH_START_FAILED"
      }
    };
  }
}

function getAdminStatus() {
  if (process.platform !== "win32") {
    return {
      isAdmin: false,
      platform: process.platform,
      message: "FlashTitan media creation is only implemented for Windows in this build."
    };
  }

  try {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { 'True' } else { 'False' }"
      ],
      {
        windowsHide: true,
        encoding: "utf8",
        timeout: 5000
      }
    );

    const stdout = String(result.stdout || "").trim().toLowerCase();
    const stderr = String(result.stderr || "").trim();
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0 && stderr) {
      throw new Error(stderr);
    }

    const isAdmin = stdout === "true";
    return {
      isAdmin,
      platform: process.platform,
      message: isAdmin
        ? "FlashTitan is running with the privileges needed for real media operations."
        : "Run FlashTitan as Administrator to create bootable media."
    };
  } catch {
    return {
      isAdmin: false,
      platform: process.platform,
      message: "FlashTitan could not confirm Administrator rights. Run it as Administrator to create bootable media."
    };
  }
}

function getDownloadDirectory(settings) {
  const preferred = sanitizeText(settings.downloadedImageDirectory || "");
  if (preferred) {
    return preferred;
  }
  return path.join(app.getPath("downloads"), "FlashTitan");
}

async function selectImageFile() {
  const settings = await getSettings();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select an OS image",
    properties: ["openFile"],
    filters: [
      {
        name: "OS Images",
        extensions: ["iso", "img", "zip", "xz", "gz"]
      }
    ]
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const validation = await validateImagePath(result.filePaths[0], {
    computeHash: settings.autoHash,
    deepInspect: true
  });
  await writeAudit({ scope: "image-select", path: validation.path, classification: validation.classification });
  return { canceled: false, image: validation };
}

async function downloadImageFromUrl(payload) {
  const settings = await getSettings();
  const controller = {};
  currentOperation = {
    kind: "download",
    cancelled: false,
    controller
  };

  try {
    sendOperationEvent({
      type: "status",
      stage: "downloading",
      message: "Downloading image file."
    });

    const downloaded = await downloadFile(
      {
        url: payload.url,
        outputDirectory: getDownloadDirectory(settings),
        expectedChecksum: validateChecksum(payload.expectedChecksum || "")
      },
      (event) => sendOperationEvent(event),
      controller
    );

    const validation = await validateImagePath(downloaded.path, {
      computeHash: settings.autoHash,
      expectedChecksum: payload.expectedChecksum || downloaded.sha256,
      deepInspect: true
    });

    sendOperationEvent({
      type: "status",
      stage: "download-complete",
      message: `Download complete: ${validation.fileName}`
    });
    return {
      ok: true,
      image: validation
    };
  } finally {
    currentOperation = null;
  }
}

async function beginFlash(request) {
  if (currentOperation) {
    throw new Error("Another operation is already running.");
  }

  const settings = await getSettings();
  const typedConfirmation = sanitizeText(request.confirmationText || "");
  if (typedConfirmation !== "CONFIRM") {
    throw new Error("You must type CONFIRM before FlashTitan will continue.");
  }

  const expectedChecksum = request.expectedChecksum || "";
  if (settings.checksumPolicy === "required" && !expectedChecksum) {
    throw new Error("A SHA256 checksum is required by the current FlashTitan settings.");
  }

  const image = await validateImagePath(request.imagePath, {
    computeHash: Boolean(request.computeHash),
    expectedChecksum,
    deepInspect: true
  });
  const targets = Array.isArray(request.devices) && request.devices.length > 0
    ? validateDeviceSelections(request.devices)
    : [validateDeviceSelection(request.device)];
  const controller = { abort: null };

  currentOperation = {
    kind: "flash",
    cancelled: false,
    imagePath: image.path,
    deviceIds: targets.map((target) => target.id),
    controller
  };

  sendOperationEvent({
    type: "status",
    stage: "reviewed",
    message: `Safety review complete for ${targets.length} target device${targets.length === 1 ? "" : "s"}.`
  });

  await writeAudit({
    scope: "flash-start",
    imagePath: image.path,
    targetPaths: targets.map((target) => target.path),
    verificationMode: request.verificationMode || settings.verificationMode
  });

  try {
    const results = [];
    for (const target of targets) {
      sendOperationEvent({
        type: "status",
        stage: "target-start",
        message: `Starting flash for ${target.name}.`
      });

      const helper = startFlashHelper(
        {
          image,
          target,
          options: {
            verificationMode: request.verificationMode || settings.verificationMode,
            performanceProfile: request.performanceProfile || settings.performanceProfile,
            preferredChunkSizeMiB: request.preferredChunkSizeMiB || settings.preferredChunkSizeMiB
          }
        },
        sendOperationEvent
      );

      controller.abort = helper.abort;
      const result = await helper.promise;
      results.push({
        target,
        result
      });
    }

    const message = "Bootable media creation completed successfully.";
    sendOperationEvent({
      type: "guidance",
      stage: "guidance",
      message: results[results.length - 1]?.result?.guidance || "Use the target PC boot menu to start from the newly created media."
    });
    lastOperationContext = {
      image,
      devices: targets,
      settings,
      result: results
    };
    await writeAudit({
      scope: "flash-complete",
      imagePath: image.path,
      targetPaths: targets.map((target) => target.path),
      result: results
    });

    return {
      ok: true,
      message,
      result: results,
      logFilePath: getCurrentLogFilePath()
    };
  } catch (error) {
    const recoveryGuidance = buildRecoveryGuidance(error.message, targets.length);
    sendOperationEvent({
      type: currentOperation && currentOperation.cancelled ? "cancelled" : "error",
      stage: "error",
      message: error.message
    });
    sendOperationEvent({
      type: "guidance",
      stage: "recovery",
      message: recoveryGuidance
    });
    await writeAudit({
      scope: "flash-error",
      imagePath: image.path,
      targetPaths: targets.map((target) => target.path),
      error: error.message,
      recoveryGuidance
    });
    throw error;
  } finally {
    currentOperation = null;
  }
}

function installSecurityPolicies() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: shouldBlockSessionRequest(details.url || "") });
  });

  app.on("web-contents-created", (_, contents) => {
    contents.on("will-navigate", (event) => event.preventDefault());
    contents.on("will-attach-webview", (event) => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
  });

  session.defaultSession.setPermissionRequestHandler((_, __, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setDevicePermissionHandler(() => false);
  session.defaultSession.setUSBProtectedClassesHandler(() => []);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 860,
    minHeight: 640,
    backgroundColor: "#0f141b",
    title: "FlashTitan",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

async function restartAsAdmin() {
  if (process.platform !== "win32") {
    throw new Error("Restart as Administrator is only available on Windows.");
  }

  const exePath = process.execPath;
  const appTarget = app.isPackaged ? null : app.getAppPath();
  const args = appTarget ? [appTarget] : process.argv.slice(1);
  const argumentList = args.map((item) => `"${item}"`).join(", ");
  const command = appTarget
    ? `Start-Process -FilePath '${exePath}' -ArgumentList ${argumentList} -Verb RunAs`
    : `Start-Process -FilePath '${exePath}' -Verb RunAs`;

  await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      windowsHide: true
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("FlashTitan could not restart with Administrator privileges."));
        return;
      }
      resolve();
    });
  });

  app.quit();
}

safeHandle("dialog:select-image", async () => selectImageFile());
safeHandle("devices:list", async () => listDevices());
safeHandle("image:validate", async (_, payload) => validateImagePath(payload.path, payload || {}));
safeHandle("image:download", async (_, payload) => downloadImageFromUrl(payload || {}));
safeHandle("app:admin-status", async () => getAdminStatus());
safeHandle("app:restart-admin", async () => {
  await restartAsAdmin();
  return { ok: true };
});
safeHandle("app:settings:get", async () => getSettings());
safeHandle("app:settings:set", async (_, payload) => {
  const saved = await saveSettings(payload || {});
  await pruneLogs(saved.logRetentionDays);
  await writeAudit({ scope: "settings-save", settings: saved });
  return saved;
});
safeHandle("app:logs:open", async () => {
  const result = await shell.openPath(path.dirname(getCurrentLogFilePath()));
  if (result) {
    throw new Error(result);
  }
  return { ok: true };
});
safeHandle("app:support-bundle:create", async () => {
  const settings = await getSettings();
  const bundlePath = await createSupportBundle({
    currentLogFilePath: getCurrentLogFilePath(),
    settings,
    image: lastOperationContext?.image || null,
    devices: lastOperationContext?.devices || [],
    lastResult: lastOperationContext?.result || null
  });
  const openError = await shell.openPath(path.dirname(bundlePath));
  if (openError) {
    throw new Error(openError);
  }
  return { path: bundlePath };
});
safeHandle("app:presets:get", async () => {
  const presets = getPresets();
  await writeAudit({
    scope: "presets-get",
    presetCount: Array.isArray(presets) ? presets.length : 0
  });
  return presets;
});
safeHandle("app:preset:resolve", async (_, payload) => {
  const presetId = sanitizeText(payload?.id || "");
  await writeAudit({
    scope: "preset-resolve-request",
    presetId
  });
  const preset = await getPresetWithChecksum(presetId);
  if (preset.externalOnly) {
    await shell.openExternal(preset.downloadUrl);
    return { preset, openedExternal: true };
  }
  return { preset, openedExternal: false };
});
safeHandle("flash:capabilities", async () => getWriterAvailability());
safeHandle("flash:start", async (_, payload) => handleFlashStartRequest(payload));
safeHandle("flash:cancel", async () => {
  if (currentOperation) {
    currentOperation.cancelled = true;
    if (currentOperation.controller?.abort) {
      currentOperation.controller.abort();
    }
  }
  await writeAudit({ scope: "operation-cancel-requested", kind: currentOperation?.kind || "unknown" });
  return { ok: true };
});
safeHandle("external:open-raspberry-pi-docs", async () => {
  const targetUrl = "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-device-boot-mode";
  if (!ALLOWED_EXTERNAL_URLS.has(targetUrl)) {
    throw new Error("External URL is not allowlisted.");
  }
  await shell.openExternal(targetUrl);
  return { ok: true };
});

app.whenReady().then(async () => {
  if (!app.isPackaged) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
  }

  const userDataPath = app.getPath("userData");
  initializeSettingsStore(userDataPath);
  initializeLogStore(userDataPath);
  const settings = await getSettings();
  await pruneLogs(settings.logRetentionDays);
  await writeAudit({ scope: "app-start", version: app.getVersion(), logFilePath: getCurrentLogFilePath() });

  installSecurityPolicies();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
