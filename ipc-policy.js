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

module.exports = {
  VALID_CHANNELS,
  sanitizePayload
};
