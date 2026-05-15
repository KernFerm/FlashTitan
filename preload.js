const { contextBridge, ipcRenderer } = require("electron");

const VALID_CHANNELS = new Set([
  "dialog:select-image",
  "devices:list",
  "image:validate",
  "image:download",
  "app:admin-status",
  "app:restart-admin",
  "app:settings:get",
  "app:settings:set",
  "app:logs:open",
  "app:support-bundle:create",
  "app:presets:get",
  "app:preset:resolve",
  "flash:capabilities",
  "flash:start",
  "flash:cancel",
  "external:open-raspberry-pi-docs"
]);

function sanitizePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === "string") {
    return payload.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 4096);
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.slice(0, 64).map((item) => sanitizePayload(item));
  }

  if (typeof payload === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(payload).slice(0, 48)) {
      sanitized[String(key).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 128)] = sanitizePayload(value);
    }
    return sanitized;
  }

  throw new Error("Unsupported payload type.");
}

function invoke(channel, payload) {
  if (!VALID_CHANNELS.has(channel)) {
    throw new Error(`Blocked IPC channel: ${channel}`);
  }

  return ipcRenderer.invoke(channel, sanitizePayload(payload));
}

async function invokeFlashStart(payload) {
  const response = await invoke("flash:start", payload);
  if (!response || typeof response !== "object") {
    throw new Error("Flash start response was invalid.");
  }
  if (!response.ok) {
    throw new Error(response.error?.message || "Flash operation failed.");
  }
  return response.data;
}

contextBridge.exposeInMainWorld("flashTitanApi", Object.freeze({
  selectImage: () => invoke("dialog:select-image"),
  listDevices: (showAll) => invoke("devices:list", { showAll: Boolean(showAll) }),
  validateImage: (payload) => invoke("image:validate", payload),
  downloadImage: (payload) => invoke("image:download", payload),
  getAdminStatus: () => invoke("app:admin-status"),
  restartAsAdmin: () => invoke("app:restart-admin"),
  getSettings: () => invoke("app:settings:get"),
  saveSettings: (payload) => invoke("app:settings:set", payload),
  openLogsFolder: () => invoke("app:logs:open"),
  createSupportBundle: () => invoke("app:support-bundle:create"),
  getPresets: () => invoke("app:presets:get"),
  resolvePreset: (payload) => invoke("app:preset:resolve", payload),
  getFlashCapabilities: () => invoke("flash:capabilities"),
  startFlash: (payload) => invokeFlashStart(payload),
  cancelFlash: () => invoke("flash:cancel"),
  openRaspberryPiDocs: () => invoke("external:open-raspberry-pi-docs"),
  onFlashEvent: (callback) => {
    if (typeof callback !== "function") {
      throw new Error("A callback function is required.");
    }

    const listener = (_, event) => callback(event);
    ipcRenderer.on("flash:event", listener);
    return () => ipcRenderer.removeListener("flash:event", listener);
  }
}));
