const { classifyImage, createWindowsInstallerUsb, getWriterAvailability, writeRawImage } = require("./windows-media");

function normalizeOperationError(error, context = {}) {
  const originalMessage = error instanceof Error ? error.message : "Flash operation failed.";
  const message = String(originalMessage || "").trim();
  const lowered = message.toLowerCase();
  const targetName = context.targetName || "the removable drive";

  if (lowered.includes("operation cancelled")) {
    return new Error(
      `FlashTitan stopped the job before it finished. Unplug ${targetName}, plug it back in, and format it in Windows if it looks unreadable before trying again.`
    );
  }

  if (lowered.includes("must be run as administrator")) {
    return new Error("FlashTitan needs to be run as Administrator before it can write or format removable media.");
  }

  if (lowered.includes("read-only")) {
    return new Error(
      `${targetName} looks read-only right now. Check for a physical lock switch, reconnect the drive, and try again.`
    );
  }

  if (lowered.includes("too small for the chosen image")) {
    return new Error(`${targetName} is too small for this image. Pick a larger removable drive and try again.`);
  }

  if (lowered.includes("being used by another process") || lowered.includes("access is denied")) {
    return new Error(
      `Windows would not give FlashTitan full access to ${targetName}. Close File Explorer windows, antivirus scans, backup tools, or other drive apps, reconnect the drive, and try again.`
    );
  }

  if (lowered.includes("could not determine the assigned usb drive letter")) {
    return new Error(
      `Windows reformatted ${targetName} but did not give it a usable drive letter afterward. Unplug it, plug it back in, refresh the drive list, and try again.`
    );
  }

  if (lowered.includes("cannot find install.wim") || lowered.includes("cannot find install.esd")) {
    return new Error(
      "FlashTitan mounted the Windows ISO but could not find the expected Windows setup image inside it. Re-download the ISO from an official Microsoft source and try again."
    );
  }

  if (lowered.includes("verification failed") || lowered.includes("mismatch between the source image")) {
    return new Error(
      `FlashTitan finished writing, but the check back from ${targetName} did not match the source image. Reconnect the drive, try a different USB port or removable drive, and run the flash again.`
    );
  }

  if (lowered.includes("physicaldrive") || lowered.includes("the system cannot find the file specified")) {
    return new Error(
      `${targetName} may have disconnected or come back in an unexpected state during the write. Reconnect it, refresh the drive list, and try again.`
    );
  }

  if (lowered.includes("powershell media operation failed")) {
    return new Error(
      `Windows stopped the media operation before FlashTitan could finish on ${targetName}. Reconnect the drive, close anything using it, and try again.`
    );
  }

  return new Error(message || "Flash operation failed.");
}

async function runFlashWorkflow({ image, target, options }, sendEvent, controller) {
  const classification = await classifyImage(image.path);

  if (classification.mode === "unsupported") {
    throw new Error(classification.message);
  }

  if (typeof sendEvent === "function") {
    sendEvent({
      type: "classification",
      stage: "classification",
      message: classification.message,
      details: {
        mode: classification.mode,
        kind: classification.kind,
        extracted: Boolean(classification.prepared?.extracted),
        archiveType: classification.prepared?.archiveType || null,
        archiveCandidates: classification.prepared?.archiveCandidates || [],
        sourcePath: classification.prepared?.sourcePath || image.path,
        preparedPath: classification.prepared?.preparedPath || image.path
      }
    });
  }

  const preparedPath = classification.prepared?.preparedPath || image.path;
  const operationOptions = {
    verificationMode: options.verificationMode,
    performanceProfile: options.performanceProfile,
    preferredChunkSizeMiB: options.preferredChunkSizeMiB
  };

  try {
    const result =
      classification.mode === "windows-installer-usb"
        ? await createWindowsInstallerUsb(preparedPath, target.path, operationOptions, sendEvent, controller)
        : await writeRawImage(preparedPath, target.path, operationOptions, sendEvent, controller);

    return {
      ...result,
      classification,
      guidance: classification.guidance
    };
  } catch (error) {
    if (typeof sendEvent === "function") {
      sendEvent({
        type: "warning",
        stage: "recovery",
        message: `FlashTitan is preparing retry guidance for ${target.name || "the selected drive"}.`
      });
    }
    throw normalizeOperationError(error, { targetName: target.name || target.path || "the removable drive" });
  }
}

module.exports = {
  __test: {
    normalizeOperationError
  },
  getWriterAvailability,
  runFlashWorkflow
};
