function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/[\u0000-\u001f\u007f<>`"'\\]/g, "").trim().slice(0, 260);
}

function sanitizeDevicePath(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/[\u0000-\u001f\u007f<>`"']/g, "").trim().slice(0, 260);
}

function formatBytes(value) {
  const numericValue = Number(value) || 0;
  if (numericValue <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(numericValue) / Math.log(1024)), units.length - 1);
  const scaled = numericValue / 1024 ** unitIndex;
  return `${scaled.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getSystemDriveLetter(systemRoot = process.env.SystemDrive || "C:") {
  return sanitizeText(String(systemRoot).toUpperCase(), "C:");
}

function parseDiskNumber(devicePath) {
  const match = String(devicePath || "").match(/physicaldrive(\d+)/i);
  return match ? Number(match[1]) : null;
}

function createHealthWarnings(device, metadata) {
  const warnings = [];
  if ((device.size || 0) < 8 * 1024 * 1024 * 1024) {
    warnings.push("Very small device capacity. Double-check that this is the intended target.");
  }
  if (metadata?.isReadOnly) {
    warnings.push("Drive is read-only and may not be writable.");
  }
  if (metadata?.healthStatus && !["Healthy", "Unknown"].includes(metadata.healthStatus)) {
    warnings.push(`Drive health status: ${metadata.healthStatus}.`);
  }
  if (metadata?.busType && ["USB", "SD"].includes(metadata.busType) === false) {
    warnings.push(`Drive bus type is ${metadata.busType}, which may not behave like a standard removable device.`);
  }
  if (metadata?.serialNumber === "" || metadata?.serialNumber === null) {
    warnings.push("Device serial number is unavailable.");
  }
  return warnings;
}

function isBusTypeRemovable(busType) {
  return ["USB", "SD"].includes(String(busType || "").toUpperCase());
}

function buildDeviceRecord(drive, metadataMap, options = {}) {
  const description = sanitizeText(
    [drive.description, drive.busType, drive.device].filter(Boolean).join(" | "),
    "Unknown device"
  );

  const mountPoints = Array.isArray(drive.mountpoints)
    ? drive.mountpoints
        .map((item) => sanitizeText(item.path || ""))
        .filter(Boolean)
    : [];

  const systemDrive = getSystemDriveLetter(options.systemDrive);
  const normalizedMounts = mountPoints.map((item) => item.toUpperCase());
  const appearsSystem = normalizedMounts.some((item) => item.startsWith(systemDrive));
  const diskNumber = parseDiskNumber(drive.device || drive.raw);
  const metadata = metadataMap.get(drive.device || drive.raw) || metadataMap.get(String(diskNumber)) || null;
  const metadataBusType = String(metadata?.busType || "").toUpperCase();
  const reportedRemovable = Boolean(drive.isRemovable);
  const removableByMetadata = isBusTypeRemovable(metadataBusType);
  const removable = Boolean(reportedRemovable || removableByMetadata);
  const isInternal = Boolean(drive.isSystem || (!removable && !removableByMetadata));
  const isBlocked = appearsSystem || isInternal;
  const warnings = createHealthWarnings(drive, metadata);

  return {
    id: sanitizeDevicePath(drive.device || drive.raw || description),
    name: sanitizeText(metadata?.friendlyName || description),
    size: Number(drive.size) || 0,
    sizeLabel: formatBytes(drive.size),
    path: sanitizeDevicePath(drive.device || "Unavailable"),
    mountPoints,
    type: sanitizeText(metadata?.busType || drive.busType || "unknown"),
    removable,
    system: Boolean(drive.isSystem || appearsSystem || metadata?.isSystem),
    internal: Boolean(isInternal),
    blocked: Boolean(isBlocked),
    serialNumber: sanitizeText(metadata?.serialNumber || ""),
    partitionStyle: sanitizeText(metadata?.partitionStyle || ""),
    operationalStatus: sanitizeText(metadata?.operationalStatus || ""),
    healthStatus: sanitizeText(metadata?.healthStatus || ""),
    readOnly: Boolean(metadata?.isReadOnly),
    volumeLabels: Array.isArray(metadata?.volumes)
      ? metadata.volumes.map((volume) => sanitizeText(volume.label || "")).filter(Boolean)
      : [],
    warnings,
    badges: [
      removable ? "Removable Device" : "Internal Drive Blocked",
      appearsSystem || drive.isSystem ? "System Drive Protected" : "",
      metadata?.isReadOnly ? "Read-Only Warning" : "",
      "Verification Enabled",
      "SHA256 Ready"
    ].filter(Boolean)
  };
}

function validateDeviceSelection(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Device selection is required.");
  }

  const target = {
    id: sanitizeDevicePath(payload.id),
    name: sanitizeText(payload.name || "Unknown device"),
    path: sanitizeDevicePath(payload.path || ""),
    size: Number(payload.size) || 0,
    removable: Boolean(payload.removable),
    system: Boolean(payload.system),
    internal: Boolean(payload.internal),
    blocked: Boolean(payload.blocked),
    type: sanitizeText(payload.type || "unknown"),
    warnings: Array.isArray(payload.warnings) ? payload.warnings.map((item) => sanitizeText(item)) : []
  };

  if (!target.id || !target.path) {
    throw new Error("Device details are incomplete.");
  }
  if (target.path.toUpperCase().includes("C:")) {
    throw new Error("Drive C: is permanently blocked.");
  }
  if (target.system || target.internal || target.blocked || !target.removable) {
    throw new Error("The selected device is blocked by FlashTitan safety rules.");
  }

  return target;
}

function validateDeviceSelections(payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("At least one removable target device must be selected.");
  }

  const seenPaths = new Set();
  return payload.map((item) => {
    const validated = validateDeviceSelection(item);
    if (seenPaths.has(validated.path)) {
      throw new Error("Duplicate removable devices were selected.");
    }
    seenPaths.add(validated.path);
    return validated;
  });
}

module.exports = {
  buildDeviceRecord,
  createHealthWarnings,
  getSystemDriveLetter,
  isBusTypeRemovable,
  parseDiskNumber,
  sanitizeDevicePath,
  sanitizeText,
  validateDeviceSelection,
  validateDeviceSelections
};
