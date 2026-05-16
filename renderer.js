const state = {
  image: null,
  devices: [],
  selectedDeviceIds: [],
  showAllDevices: false,
  autoHash: true,
  running: false,
  refreshingDevices: false,
  showAdvancedFields: false,
  writerMode: "unknown",
  settings: {
    experienceMode: "simple",
    verificationMode: "full",
    autoHash: true,
    advancedModeDefault: false,
    checksumPolicy: "optional",
    performanceProfile: "balanced",
    logRetentionDays: 14,
    preferredChunkSizeMiB: 4
  },
  latestGuidance: "",
  latestClassification: null,
  presets: [],
  selectedPreset: null
};

const elements = {
  selectImageButton: document.getElementById("selectImageButton"),
  downloadImageButton: document.getElementById("downloadImageButton"),
  presetSelect: document.getElementById("presetSelect"),
  loadPresetButton: document.getElementById("loadPresetButton"),
  openPresetButton: document.getElementById("openPresetButton"),
  downloadUrlInput: document.getElementById("downloadUrlInput"),
  downloadChecksumInput: document.getElementById("downloadChecksumInput"),
  refreshDevicesButton: document.getElementById("refreshDevicesButton"),
  advancedToggleButton: document.getElementById("advancedToggleButton"),
  advancedModeToggle: document.getElementById("advancedModeToggle"),
  checksumInput: document.getElementById("checksumInput"),
  autoHashToggle: document.getElementById("autoHashToggle"),
  confirmInput: document.getElementById("confirmInput"),
  startFlashButton: document.getElementById("startFlashButton"),
  cancelButton: document.getElementById("cancelButton"),
  imageSummary: document.getElementById("imageSummary"),
  imageAdvancedFields: document.getElementById("imageAdvancedFields"),
  safetyAdvancedFields: document.getElementById("safetyAdvancedFields"),
  downloadChecksumField: document.getElementById("downloadChecksumField"),
  checksumField: document.getElementById("checksumField"),
  deviceList: document.getElementById("deviceList"),
  safetyReview: document.getElementById("safetyReview"),
  verificationPanel: document.getElementById("verificationPanel"),
  completionPanel: document.getElementById("completionPanel"),
  classificationPanel: document.getElementById("classificationPanel"),
  logPanel: document.getElementById("logPanel"),
  badgeTray: document.getElementById("badgeTray"),
  progressLabel: document.getElementById("progressLabel"),
  progressPercent: document.getElementById("progressPercent"),
  progressFill: document.getElementById("progressFill"),
  speedValue: document.getElementById("speedValue"),
  etaValue: document.getElementById("etaValue"),
  bytesValue: document.getElementById("bytesValue"),
  statusBadge: document.getElementById("statusBadge"),
  operationState: document.getElementById("operationState"),
  piDocsButton: document.getElementById("piDocsButton"),
  adminModal: document.getElementById("adminModal"),
  adminModalMessage: document.getElementById("adminModalMessage"),
  adminRestartButton: document.getElementById("adminRestartButton"),
  adminModalClose: document.getElementById("adminModalClose"),
  settingsModal: document.getElementById("settingsModal"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  openLogsButton: document.getElementById("openLogsButton"),
  openLogsCardButton: document.getElementById("openLogsCardButton"),
  createSupportBundleButton: document.getElementById("createSupportBundleButton"),
  settingsSaveButton: document.getElementById("settingsSaveButton"),
  settingsCloseButton: document.getElementById("settingsCloseButton"),
  experienceModeSelect: document.getElementById("experienceModeSelect"),
  verificationModeSelect: document.getElementById("verificationModeSelect"),
  checksumPolicySelect: document.getElementById("checksumPolicySelect"),
  performanceProfileSelect: document.getElementById("performanceProfileSelect"),
  chunkSizeInput: document.getElementById("chunkSizeInput"),
  logRetentionInput: document.getElementById("logRetentionInput"),
  settingsAutoHashToggle: document.getElementById("settingsAutoHashToggle"),
  settingsAdvancedToggle: document.getElementById("settingsAdvancedToggle")
};

const api = window.flashTitanApi;

function sanitizeText(value) {
  return String(value ?? "").replace(/[<>&"'`\u0000-\u001f\u007f]/g, "").trim();
}

function normalizeChecksum(value) {
  return sanitizeText(value).replace(/[^a-fA-F0-9]/g, "").slice(0, 64).toLowerCase();
}

function escapeHtml(value) {
  return sanitizeText(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function setSelectOptions(select, options) {
  select.replaceChildren();
  for (const optionData of options) {
    const option = document.createElement("option");
    option.value = typeof optionData.value === "string" ? optionData.value : "";
    option.textContent = typeof optionData.label === "string" ? optionData.label : "";
    select.appendChild(option);
  }
}

function appendLog(message, tone = "info") {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <time>${new Date().toLocaleTimeString()}</time>
    <strong>${tone === "error" ? "Warning" : tone === "success" ? "Success" : "Status"}</strong>
    <span>${escapeHtml(message)}</span>
  `;
  elements.logPanel.prepend(entry);
}

function getSelectedDevices() {
  return state.devices.filter((device) => state.selectedDeviceIds.includes(device.id));
}

function getPrimarySelectedDevice() {
  return getSelectedDevices()[0] || null;
}

function showModal(modal) {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function hideModal(modal) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function setRunning(isRunning) {
  state.running = isRunning;
  elements.selectImageButton.disabled = isRunning;
  elements.downloadImageButton.disabled = isRunning;
  elements.loadPresetButton.disabled = isRunning;
  elements.openPresetButton.disabled = isRunning;
  elements.refreshDevicesButton.disabled = isRunning;
  elements.advancedModeToggle.disabled = isRunning;
  elements.checksumInput.disabled = isRunning;
  elements.autoHashToggle.disabled = isRunning;
  elements.confirmInput.disabled = isRunning;
  elements.cancelButton.disabled = !isRunning;
  updateStartButtonState();
}

function shouldShowChecksumFields() {
  return (
    state.showAdvancedFields ||
    state.settings.checksumPolicy === "required" ||
    Boolean(state.selectedPreset?.hasChecksum)
  );
}

function renderAdvancedVisibility() {
  const showAdvanced = state.showAdvancedFields;
  elements.imageAdvancedFields.classList.toggle("hidden", !showAdvanced);
  elements.safetyAdvancedFields.classList.toggle("hidden", !showAdvanced && !shouldShowChecksumFields());
  elements.downloadChecksumField.classList.toggle("hidden", !shouldShowChecksumFields());
  elements.checksumField.classList.toggle("hidden", !shouldShowChecksumFields());
  elements.advancedToggleButton.textContent = showAdvanced ? "Hide Advanced" : "Show Advanced";
}

function setRefreshState(isRefreshing, message = "") {
  state.refreshingDevices = isRefreshing;
  elements.refreshDevicesButton.disabled = isRefreshing || state.running;
  elements.refreshDevicesButton.textContent = isRefreshing ? "Looking for Drives..." : "Refresh USB Drives";
  elements.refreshDevicesButton.dataset.busy = isRefreshing ? "true" : "false";
  if (isRefreshing) {
    elements.deviceList.innerHTML = `<div class="empty-state friendly-empty-state"><strong>Looking for removable drives...</strong><span>Plug in your USB drive or SD card, then give FlashTitan a second to spot it.</span></div>`;
    if (message) {
      elements.operationState.textContent = message;
    }
  }
}

function hasRequiredConfirmation() {
  return sanitizeText(elements.confirmInput.value) === "CONFIRM";
}

function canStartFlash() {
  return Boolean(state.image && getSelectedDevices().length > 0 && hasRequiredConfirmation() && !state.running);
}

function updateStartButtonState() {
  elements.startFlashButton.disabled = !canStartFlash();
}

function renderClassificationSummary(classification) {
  if (!classification) {
    elements.classificationPanel.textContent =
      "FlashTitan will explain how it plans to handle the image after you choose one.";
    return;
  }

  const archiveSummary = classification.archiveType
    ? `<span>Archive: ${escapeHtml(classification.archiveType)}${classification.archiveCandidates?.length ? ` - extracted ${escapeHtml(classification.archiveCandidates[0])}` : ""}</span><br />`
    : "";
  const detailSummary = classification.details?.length
    ? `${classification.details.map((item) => `<span>${escapeHtml(item)}</span>`).join("<br />")}<br />`
    : "";

  elements.classificationPanel.innerHTML = `
    <strong>${escapeHtml(classification.kind || "Image route")}</strong><br />
    <span>${escapeHtml(classification.message || "No classification message available.")}</span><br />
    <span>Mode: ${escapeHtml(classification.mode || "unknown")}</span><br />
    ${archiveSummary}
    ${detailSummary}
    <span>${escapeHtml(classification.guidance || "FlashTitan will use the safest supported route for this image.")}</span>
  `;
}

function renderImageSummary() {
  if (!state.image) {
    elements.imageSummary.innerHTML = `<div class="empty-state friendly-empty-state"><strong>No image picked yet</strong><span>Choose an image file, use an official preset, or paste a direct download link to get started.</span></div>`;
    state.selectedPreset = null;
    renderAdvancedVisibility();
    renderClassificationSummary(null);
    return;
  }

  const checksumStatus =
    state.image.checksumMatch === null
      ? "No checksum check was added."
      : state.image.checksumMatch
        ? "Checksum matched."
        : "Checksum did not match.";
  const archivePreview = state.image.archivePreview;
  const archiveSummary = archivePreview
    ? [
        `Archive type: ${archivePreview.archiveType || "unknown"}`,
        Number.isFinite(archivePreview.entryCount) ? `Items inside: ${archivePreview.entryCount}` : "",
        Array.isArray(archivePreview.flashableCandidates) && archivePreview.flashableCandidates.length
          ? `Flashable choices found: ${archivePreview.flashableCandidates.join(", ")}`
          : archivePreview.error
            ? `Archive preview warning: ${archivePreview.error}`
            : "No flashable image preview found yet."
      ]
        .filter(Boolean)
        .map((line) => `<span>${escapeHtml(line)}</span>`)
        .join("<br />")
    : "";

  elements.imageSummary.innerHTML = `
    <strong>${escapeHtml(state.image.fileName)}</strong><br />
    <span>${escapeHtml(state.image.sizeLabel)} - ${escapeHtml(state.image.extension)}</span><br />
    <span>File location: ${escapeHtml(state.image.path)}</span><br />
    <span>Image SHA256: ${escapeHtml(state.image.sha256 || "Still checking")}</span><br />
    <span>${escapeHtml(checksumStatus)}</span>
    ${archiveSummary ? `<br />${archiveSummary}` : ""}
  `;

  renderClassificationSummary(state.image.classification || state.latestClassification);
}

function renderBadges(device) {
  const badges = device?.badges?.length
    ? device.badges
    : ["Removable Device", "Verification Enabled", "SHA256 Ready"];

  elements.badgeTray.innerHTML = badges
    .map((badge) => {
      const tone =
        badge.includes("Blocked") || badge.includes("Protected") || badge.includes("Warning")
          ? "warning"
          : badge.includes("Verification")
            ? "accent"
            : "";
      return `<span class="chip ${tone}">${escapeHtml(badge)}</span>`;
    })
    .join("");
}

function renderSafetyReview() {
  const selectedDevices = getSelectedDevices();
  const primaryDevice = selectedDevices[0];
  if (!state.image || !primaryDevice) {
    elements.safetyReview.innerHTML =
      `<strong>Waiting for the last two pieces</strong><br /><span>Pick an image and one removable drive, then FlashTitan will show the final erase check here.</span>`;
    elements.statusBadge.textContent = !state.image ? "Waiting for an image" : "Waiting for a removable drive";
    updateStartButtonState();
    return;
  }

  const checksum = normalizeChecksum(elements.checksumInput.value);
  const checksumLine = checksum
    ? state.image.sha256 && state.image.sha256.toLowerCase() === checksum
      ? "Your checksum matches."
      : "Your checksum does not match yet."
    : state.settings.checksumPolicy === "required"
      ? "Your current settings require a checksum before flashing."
      : "No checksum comparison was added.";
  const warnings = selectedDevices.flatMap((device) => (Array.isArray(device.warnings) ? device.warnings : []));
  const warningMarkup = warnings.length ? `<span>Please notice: ${escapeHtml(warnings.join(" | "))}</span><br />` : "";

  elements.safetyReview.innerHTML = `
    <strong>Last safety check</strong><br />
    <span>Target count: ${selectedDevices.length}</span><br />
    <span>Targets: ${escapeHtml(selectedDevices.map((device) => device.name).join(", "))}</span><br />
    <span>Chosen drive: ${escapeHtml(primaryDevice.path)} - ${escapeHtml(primaryDevice.type)} - ${escapeHtml(primaryDevice.sizeLabel)}</span><br />
    <span>Check style: ${escapeHtml(state.settings.verificationMode)}</span><br />
    <span>Everything on the selected removable drive will be erased.</span><br />
    <span>${escapeHtml(checksumLine)}</span><br />
    ${warningMarkup}
    <span>${
      hasRequiredConfirmation()
        ? "Confirmation accepted. FlashTitan is ready to make the bootable drive."
        : "Type CONFIRM exactly to unlock the flash button."
    }</span>
  `;

  elements.statusBadge.textContent = hasRequiredConfirmation() ? "Ready to go" : "Confirmation needed";
  updateStartButtonState();
}

function renderDevices() {
  if (!state.devices.length) {
    elements.deviceList.innerHTML = `<div class="empty-state friendly-empty-state"><strong>No removable drives found</strong><span>Plug in a USB drive or SD card, then click Refresh USB Drives again.</span></div>`;
    return;
  }

  elements.deviceList.innerHTML = state.devices
    .map((device, index) => {
      const selected = state.selectedDeviceIds.includes(device.id);
      const warningMarkup =
        Array.isArray(device.warnings) && device.warnings.length
          ? `<div class="device-meta warning-text">${escapeHtml(device.warnings.join(" | "))}</div>`
          : "";
      const advancedMeta =
        state.settings.experienceMode === "advanced"
          ? `<div class="device-meta">Serial: ${escapeHtml(device.serialNumber || "Unavailable")} - Partition: ${escapeHtml(
              device.partitionStyle || "Unknown"
            )} - Health: ${escapeHtml(device.healthStatus || "Unknown")}</div>`
          : "";
      return `
        <article class="device-row ${selected ? "selected" : ""} ${device.blocked ? "blocked" : ""}">
          <div class="device-row-header">
            <div>
              <strong>${escapeHtml(device.name)}</strong>
              <div class="device-meta">${escapeHtml(device.path)} - ${escapeHtml(device.type)} - ${escapeHtml(device.sizeLabel)}</div>
              ${advancedMeta}
            </div>
            <div class="device-badges">
              ${device.badges.map((badge) => `<span class="chip">${escapeHtml(badge)}</span>`).join("")}
            </div>
          </div>
          <div class="device-meta">
            Mounts: ${escapeHtml(device.mountPoints?.join(", ") || "None")} - Labels: ${escapeHtml(
              device.volumeLabels?.join(", ") || "None"
            )} - Removable: ${device.removable ? "Yes" : "No"}
          </div>
          ${warningMarkup}
          <div class="device-actions">
            <span class="device-meta">${
              device.system
                  ? "Protected system drive."
                : selected
                  ? "This drive is selected."
                  : "This looks like a removable drive."
            }</span>
            <button class="secondary-button device-select-button" ${device.blocked ? "disabled" : ""}>
              ${selected ? "Remove Drive" : "Use This Drive"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.deviceList.querySelectorAll(".device-select-button").forEach((button, buttonIndex) => {
    const device = state.devices[buttonIndex] || null;
    if (!device) {
      return;
    }
    button.addEventListener("click", () => {
      const deviceId = sanitizeText(device.id);
      const currentlySelected = state.selectedDeviceIds.includes(deviceId);
      if (currentlySelected) {
        state.selectedDeviceIds = state.selectedDeviceIds.filter((item) => item !== deviceId);
      } else {
        state.selectedDeviceIds = [...state.selectedDeviceIds, deviceId];
      }
      renderDevices();
      renderBadges(getPrimarySelectedDevice());
      renderSafetyReview();
      appendLog(
        `${currentlySelected ? "Removed" : "Added"} target device: ${
          state.devices.find((device) => device.id === deviceId)?.name || "Unknown device"
        }.`
      );
    });
  });
}

function updateProgress(event) {
  const percent = Number(event.percent || 0);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent.toFixed(1)}%`;
  if (event.type === "download-progress") {
    elements.progressLabel.textContent = "Downloading the image";
  } else if (event.stage === "verifying") {
    elements.progressLabel.textContent = "Checking the finished drive";
  } else if (event.stage === "hashing") {
    elements.progressLabel.textContent = "Checking the image before writing";
  } else if (event.stage === "flashing") {
    elements.progressLabel.textContent = "Writing the drive";
  } else {
    elements.progressLabel.textContent = "Getting the bootable drive ready";
  }
  elements.speedValue.textContent = formatSpeed(event.speedBytesPerSecond || 0);
  elements.etaValue.textContent = formatEta(event.etaSeconds);
  elements.bytesValue.textContent = `${formatBytes(event.processedBytes)} / ${formatBytes(event.totalBytes)}`;
}

function applySettingsToControls() {
  elements.autoHashToggle.checked = Boolean(state.settings.autoHash);
  state.autoHash = Boolean(state.settings.autoHash);
  elements.advancedModeToggle.checked = Boolean(state.settings.advancedModeDefault);
  state.showAllDevices = Boolean(state.settings.advancedModeDefault);
  state.showAdvancedFields = state.settings.experienceMode === "advanced";
  elements.experienceModeSelect.value = state.settings.experienceMode;
  elements.verificationModeSelect.value = state.settings.verificationMode;
  elements.checksumPolicySelect.value = state.settings.checksumPolicy;
  elements.performanceProfileSelect.value = state.settings.performanceProfile;
  elements.chunkSizeInput.value = String(state.settings.preferredChunkSizeMiB);
  elements.logRetentionInput.value = String(state.settings.logRetentionDays);
  elements.settingsAutoHashToggle.checked = Boolean(state.settings.autoHash);
  elements.settingsAdvancedToggle.checked = Boolean(state.settings.advancedModeDefault);
  renderAdvancedVisibility();
}

async function loadSettings() {
  try {
    const settings = await window.flashTitanApi.getSettings();
    state.settings = {
      ...state.settings,
      ...(settings || {})
    };
    if (!state.settings.experienceMode) {
      state.settings.experienceMode = "simple";
    }
    applySettingsToControls();
  } catch (error) {
    appendLog(error.message || "Failed to load settings.", "error");
  }
}

async function saveSettings() {
  try {
    const saved = await window.flashTitanApi.saveSettings({
      experienceMode: elements.experienceModeSelect.value,
      verificationMode: elements.verificationModeSelect.value,
      checksumPolicy: elements.checksumPolicySelect.value,
      performanceProfile: elements.performanceProfileSelect.value,
      preferredChunkSizeMiB: Number(elements.chunkSizeInput.value),
      logRetentionDays: Number(elements.logRetentionInput.value),
      autoHash: elements.settingsAutoHashToggle.checked,
      advancedModeDefault: elements.settingsAdvancedToggle.checked
    });
    state.settings = {
      ...state.settings,
      ...saved
    };
    state.settings.experienceMode = sanitizeText(elements.experienceModeSelect.value) || "simple";
    applySettingsToControls();
    renderDevices();
    renderSafetyReview();
    appendLog("Settings saved.", "success");
    hideModal(elements.settingsModal);
  } catch (error) {
    appendLog(error.message || "Failed to save settings.", "error");
  }
}

async function refreshDevices() {
  setRefreshState(true, "FlashTitan is checking for removable drives.");
  try {
    const devices = await window.flashTitanApi.listDevices(state.showAllDevices);
    state.devices = Array.isArray(devices) ? devices : [];
    state.selectedDeviceIds = state.selectedDeviceIds.filter((id) => state.devices.some((device) => device.id === id));
    renderDevices();
    renderBadges(getPrimarySelectedDevice());
    renderSafetyReview();
    elements.operationState.textContent = state.devices.length
      ? `Found ${state.devices.length} removable drive${state.devices.length === 1 ? "" : "s"}.`
      : "No removable drives showed up yet.";
    appendLog(
      state.devices.length
        ? `Found ${state.devices.length} removable drive${state.devices.length === 1 ? "" : "s"}.`
        : "No removable drives showed up yet."
    );
  } catch (error) {
    appendLog(error.message || "Failed to refresh devices.", "error");
  } finally {
    setRefreshState(false);
  }
}

async function selectImage() {
  try {
    appendLog("Opening image selector.");
    const result = await window.flashTitanApi.selectImage();
    if (result?.canceled) {
      appendLog("Image selection cancelled.");
      return;
    }
    state.image = result.image;
    state.latestClassification = result.image?.classification || null;
    renderImageSummary();
    renderSafetyReview();
    appendLog(`Validated image: ${state.image.fileName}.`, "success");
    elements.operationState.textContent = "Image checked. Next, choose the removable drive you want to use.";
    renderAdvancedVisibility();
  } catch (error) {
    state.image = null;
    renderImageSummary();
    renderSafetyReview();
    appendLog(error.message || "Image validation failed.", "error");
    renderAdvancedVisibility();
  }
}

async function downloadImage() {
  const url = sanitizeText(elements.downloadUrlInput.value);
  if (!url) {
    appendLog("Enter a download URL before starting the download.", "error");
    return;
  }

  try {
    setRunning(true);
    appendLog(`Downloading image from ${url}.`);
    elements.operationState.textContent = "Downloading the image and checking it as it arrives.";
    const result = await window.flashTitanApi.downloadImage({
      url,
      expectedChecksum: normalizeChecksum(elements.downloadChecksumInput.value)
    });
    state.image = result.image;
    state.latestClassification = result.image?.classification || null;
    renderImageSummary();
    renderSafetyReview();
    appendLog(`Downloaded and validated image: ${state.image.fileName}.`, "success");
    elements.operationState.textContent = "Download finished. Next, choose the removable drive you want to use.";
    renderAdvancedVisibility();
  } catch (error) {
    appendLog(error.message || "Image download failed.", "error");
  } finally {
    setRunning(false);
  }
}

async function loadPresets() {
  setSelectOptions(elements.presetSelect, [{ value: "", label: "Loading official presets..." }]);
  elements.presetSelect.disabled = true;
  try {
    state.presets = await window.flashTitanApi.getPresets();
    if (!Array.isArray(state.presets) || state.presets.length === 0) {
      setSelectOptions(elements.presetSelect, [{ value: "", label: "No presets are available right now" }]);
      elements.operationState.textContent = "FlashTitan could not load the preset catalog right now.";
      appendLog("No official presets were returned.", "error");
      return;
    }
    setSelectOptions(
      elements.presetSelect,
      [{ value: "", label: "Choose an official preset" }].concat(
        state.presets.map((preset) => ({
          value: sanitizeText(preset.id),
          label: `${sanitizeText(preset.name)} - ${sanitizeText(preset.vendor || "Unknown vendor")}`
        }))
      )
    );
    elements.presetSelect.disabled = false;
    appendLog(`Loaded ${state.presets.length} official presets.`, "success");
  } catch (error) {
    setSelectOptions(elements.presetSelect, [{ value: "", label: "Could not load presets" }]);
    elements.operationState.textContent = "FlashTitan could not load the preset catalog.";
    appendLog(error.message || "Failed to load official presets.", "error");
  }
}

async function resolvePreset(openExternal) {
  const presetId = sanitizeText(elements.presetSelect.value);
  if (!presetId) {
    appendLog("Choose an official preset first.", "error");
    return;
  }

  try {
    const result = await window.flashTitanApi.resolvePreset({ id: presetId });
    const preset = result?.preset;
    if (!preset) {
      appendLog("Preset resolution returned no data.", "error");
      return;
    }

    state.selectedPreset = preset;
    elements.downloadUrlInput.value = preset.downloadUrl || "";
    elements.downloadChecksumInput.value = preset.expectedChecksum || "";
    renderAdvancedVisibility();
    elements.classificationPanel.innerHTML = `
      <strong>${escapeHtml(preset.name)}</strong><br />
      <span>Vendor: ${escapeHtml(preset.vendor || "Unknown vendor")}</span><br />
      <span>Source type: ${escapeHtml(preset.sourceType || "unknown")}</span><br />
      <span>Checksum support: ${escapeHtml(preset.hasChecksum ? "available" : "not included")}</span><br />
      <span>${escapeHtml(preset.guidance || "Official preset loaded.")}</span><br />
      <span>${escapeHtml(result.openedExternal ? "Opened vendor page for download." : "Ready to download through FlashTitan.")}</span>
    `;
    appendLog(`${preset.name} preset loaded${result.openedExternal ? " and vendor page opened" : ""}.`, "success");
    elements.operationState.textContent = result.openedExternal
      ? "Official download page opened. Bring the image back here when you have it."
      : "Preset loaded. You can download the image inside FlashTitan now.";

    if (openExternal && !result.openedExternal && preset.downloadUrl) {
      appendLog("Use Download Image to fetch the preset directly inside FlashTitan.");
    }
  } catch (error) {
    appendLog(error.message || "Preset resolution failed.", "error");
  }
}

async function createSupportBundle() {
  try {
    const result = await window.flashTitanApi.createSupportBundle();
    appendLog(`Support bundle created: ${result.path || "bundle ready"}.`, "success");
  } catch (error) {
    appendLog(error.message || "Failed to create support bundle.", "error");
  }
}

async function startFlash() {
  const devices = getSelectedDevices();
  if (!state.image) {
    appendLog("Select and validate an image before starting.", "error");
    return;
  }
  if (!devices.length) {
    appendLog("Select at least one removable target device before starting.", "error");
    return;
  }
  if (!hasRequiredConfirmation()) {
    elements.statusBadge.textContent = "Confirmation needed";
    elements.completionPanel.textContent = "Type CONFIRM exactly before starting.";
    appendLog("Type CONFIRM exactly before FlashTitan can continue.", "error");
    updateStartButtonState();
    return;
  }

  setRunning(true);
  elements.verificationPanel.textContent = `FlashTitan will do a ${state.settings.verificationMode} check after writing.`;
  elements.completionPanel.innerHTML = `<strong>Working on it now</strong><br /><span>Keep this window open while FlashTitan writes and checks the drive.</span>`;
  elements.operationState.textContent = "Buttons are locked while FlashTitan works.";
  appendLog(`Started making bootable media for ${devices.length} target device${devices.length === 1 ? "" : "s"}.`);

  try {
    const result = await window.flashTitanApi.startFlash({
      imagePath: state.image.path,
      devices,
      computeHash: state.autoHash,
      expectedChecksum: normalizeChecksum(elements.checksumInput.value),
      confirmationText: sanitizeText(elements.confirmInput.value),
      verificationMode: state.settings.verificationMode,
      performanceProfile: state.settings.performanceProfile,
      preferredChunkSizeMiB: state.settings.preferredChunkSizeMiB
    });

    const results = Array.isArray(result.result) ? result.result : [];
    const finalGuidance = results[results.length - 1]?.result?.guidance || state.latestGuidance;
    const targetSummary = results.length
      ? results.map((entry) => entry.target?.name || entry.target?.path || "Unknown target").join(", ")
      : devices.map((device) => device.name).join(", ");

    elements.completionPanel.innerHTML = `
      <strong>Your bootable drive is ready</strong><br />
      <span>Finished target${results.length === 1 ? "" : "s"}: ${escapeHtml(targetSummary)}</span><br />
      <span>Next step: ${escapeHtml(finalGuidance || "Use the target system boot menu to start from the flashed media.")}</span><br />
      <span>Verification mode: ${escapeHtml(state.settings.verificationMode)}</span><br />
      <span>Need details later? Log file: ${escapeHtml(result.logFilePath || "Unavailable")}</span>
    `;
    elements.statusBadge.textContent = "Done";
    elements.operationState.textContent = "FlashTitan finished the drive and the final check.";
    appendLog("Your bootable drive is ready.", "success");
  } catch (error) {
    elements.completionPanel.innerHTML = `<strong>FlashTitan needs your attention</strong><br /><span>${escapeHtml(error.message || "Operation failed.")}</span>`;
    elements.statusBadge.textContent =
      sanitizeText(error.message).toLowerCase().includes("cancel") ? "Stopped" : "Needs attention";
    elements.operationState.textContent = "The job ended with a warning.";
    appendLog(error.message || "Operation failed.", "error");
  } finally {
    setRunning(false);
  }
}

function registerFlashEvents() {
  window.flashTitanApi.onFlashEvent((event) => {
    if (!event || typeof event !== "object") {
      return;
    }

    if (["progress", "hash-progress", "download-progress"].includes(event.type)) {
      updateProgress(event);
      if (event.stage === "verifying") {
        elements.verificationPanel.textContent = `Verification in progress (${state.settings.verificationMode}).`;
      }
      return;
    }

    if (event.type === "classification") {
      state.latestGuidance = event.details?.mode || "";
      state.latestClassification = {
        kind: event.details?.kind || "Image route",
        message: event.message || "File check updated.",
        mode: event.details?.mode || "unknown",
        guidance: event.details?.preparedPath ? `Working file: ${event.details.preparedPath}` : "",
        archiveType: event.details?.archiveType || "",
        archiveCandidates: Array.isArray(event.details?.archiveCandidates) ? event.details.archiveCandidates : [],
        details: [
          event.details?.sourcePath ? `Source file: ${event.details.sourcePath}` : "",
          event.details?.preparedPath ? `Prepared file: ${event.details.preparedPath}` : "",
          event.details?.extracted ? "Archive extraction was used before classification." : ""
        ].filter(Boolean)
      };
      renderClassificationSummary(state.latestClassification);
      appendLog(event.message || "File check updated.");
      return;
    }

    if (event.type === "status") {
      elements.operationState.textContent = sanitizeText(event.message || "FlashTitan updated the status.");
      appendLog(event.message || "FlashTitan updated the status.");
      if (event.stage === "copying" || event.stage === "preparing-target" || event.stage === "mounting") {
        elements.progressLabel.textContent = "Getting the drive ready";
      }
      return;
    }

    if (event.type === "warning") {
      appendLog(event.message || "Warning emitted.", "error");
      return;
    }

    if (event.type === "guidance") {
      state.latestGuidance = sanitizeText(event.message || "");
      elements.completionPanel.innerHTML = `<strong>What to do next</strong><br /><span>${escapeHtml(state.latestGuidance)}</span>`;
      appendLog(state.latestGuidance);
      return;
    }

    if (event.type === "complete") {
      elements.verificationPanel.textContent = "Final check finished. The drive looks ready to use, and the verification step completed without a mismatch.";
      elements.operationState.textContent = sanitizeText(event.message || "Completed.");
      return;
    }

    if (event.type === "cancelled") {
      elements.verificationPanel.textContent = "The job was stopped. Reconnect the drive and try again if needed.";
      elements.operationState.textContent = sanitizeText(event.message || "Operation cancelled.");
      return;
    }

    if (event.type === "error") {
      elements.verificationPanel.textContent = sanitizeText(event.message || "Verification failed.");
      elements.operationState.textContent = sanitizeText(event.message || "Operation failed.");
    }
  });
}

async function loadCapabilities() {
  try {
    const capability = await window.flashTitanApi.getFlashCapabilities();
    state.writerMode = sanitizeText(capability?.mode || "unknown");
    elements.operationState.textContent =
      state.writerMode === "native-windows-engine"
        ? "FlashTitan is ready. Run it as Administrator before writing a real drive."
        : "This build can only create media on Windows.";
    appendLog(capability?.message || "FlashTitan is ready.");
  } catch (error) {
    appendLog(error.message || "Failed to load flash-engine capabilities.", "error");
  }
}

async function loadAdminStatus() {
  try {
    const status = await window.flashTitanApi.getAdminStatus();
    if (!status?.isAdmin) {
      elements.adminModalMessage.textContent =
        status?.message || "Run FlashTitan as Administrator to create bootable media.";
      showModal(elements.adminModal);
      appendLog(status?.message || "FlashTitan needs Administrator permission before writing a real drive.", "error");
    }
  } catch (error) {
    appendLog(error.message || "Failed to determine administrator status.", "error");
  }
}

elements.selectImageButton.addEventListener("click", selectImage);
elements.downloadImageButton.addEventListener("click", downloadImage);
elements.loadPresetButton.addEventListener("click", () => resolvePreset(false));
elements.openPresetButton.addEventListener("click", () => resolvePreset(true));
elements.refreshDevicesButton.addEventListener("click", refreshDevices);
elements.advancedToggleButton.addEventListener("click", () => {
  state.showAdvancedFields = !state.showAdvancedFields;
  renderAdvancedVisibility();
});
elements.autoHashToggle.addEventListener("change", (event) => {
  state.autoHash = Boolean(event.target.checked);
  appendLog(`Automatic image check ${state.autoHash ? "turned on" : "turned off"}.`);
});
elements.advancedModeToggle.addEventListener("change", async (event) => {
  if (event.target.checked && !state.settings.advancedModeDefault) {
    const proceed = window.confirm(
      "Extra drive details can help while testing, but the list will still stay limited to removable USB drives and SD cards. Continue?"
    );
    if (!proceed) {
      event.target.checked = false;
      return;
    }
  }
  state.showAllDevices = Boolean(event.target.checked);
  appendLog(`Advanced metadata ${state.showAllDevices ? "enabled" : "disabled"}.`);
  await refreshDevices();
});
elements.checksumInput.addEventListener("input", renderSafetyReview);
elements.checksumInput.addEventListener("blur", () => {
  elements.checksumInput.value = normalizeChecksum(elements.checksumInput.value);
  renderSafetyReview();
});
elements.confirmInput.addEventListener("input", renderSafetyReview);
elements.startFlashButton.addEventListener("click", startFlash);
elements.cancelButton.addEventListener("click", async () => {
  await window.flashTitanApi.cancelFlash();
  appendLog("Cancellation requested.");
});
elements.piDocsButton.addEventListener("click", async () => {
  await window.flashTitanApi.openRaspberryPiDocs();
  appendLog("Opened Raspberry Pi USB boot documentation.");
});
elements.adminModalClose.addEventListener("click", () => hideModal(elements.adminModal));
elements.adminRestartButton.addEventListener("click", async () => {
  try {
    await window.flashTitanApi.restartAsAdmin();
  } catch (error) {
    appendLog(error.message || "Failed to restart as Administrator.", "error");
  }
});
elements.adminModal.addEventListener("click", (event) => {
  if (event.target === elements.adminModal) {
    hideModal(elements.adminModal);
  }
});
elements.openSettingsButton.addEventListener("click", () => showModal(elements.settingsModal));
elements.settingsCloseButton.addEventListener("click", () => hideModal(elements.settingsModal));
elements.settingsModal.addEventListener("click", (event) => {
  if (event.target === elements.settingsModal) {
    hideModal(elements.settingsModal);
  }
});
elements.settingsSaveButton.addEventListener("click", saveSettings);
elements.openLogsButton.addEventListener("click", async () => {
  await window.flashTitanApi.openLogsFolder();
});
elements.openLogsCardButton.addEventListener("click", async () => {
  await window.flashTitanApi.openLogsFolder();
});
elements.createSupportBundleButton.addEventListener("click", createSupportBundle);
elements.experienceModeSelect.addEventListener("change", () => {
  state.settings.experienceMode = sanitizeText(elements.experienceModeSelect.value) || "simple";
  state.showAdvancedFields = state.settings.experienceMode === "advanced";
  renderAdvancedVisibility();
  renderDevices();
  renderSafetyReview();
});

function handleMissingDesktopBridge() {
  elements.operationState.textContent = "FlashTitan could not start its desktop bridge. Please reopen the updated app build.";
  elements.statusBadge.textContent = "Startup problem";
  elements.presetSelect.innerHTML = '<option value="">Desktop bridge failed to load</option>';
  elements.presetSelect.disabled = true;
  elements.deviceList.innerHTML =
    `<div class="empty-state friendly-empty-state"><strong>FlashTitan could not finish starting</strong><span>Please reopen the updated app build so USB detection and presets can load.</span></div>`;
  appendLog("Desktop bridge failed to load. Reopen the updated FlashTitan build.", "error");
}

if (!api || typeof api.getPresets !== "function" || typeof api.listDevices !== "function") {
  handleMissingDesktopBridge();
} else {
  registerFlashEvents();
  renderImageSummary();
  renderSafetyReview();
  renderBadges(null);
  renderAdvancedVisibility();
  loadSettings().then(() => {
    renderSafetyReview();
    refreshDevices();
  });
  loadPresets();
  loadAdminStatus();
  loadCapabilities();
  updateStartButtonState();
}
