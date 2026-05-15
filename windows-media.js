const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { prepareFlashableImage } = require("./archive-utils");

const SCRIPTS_DIR = path.join(__dirname, "windows-scripts");
const POWERSHELL_EXE = "powershell.exe";
const JSON_EVENT_PREFIX = "[FlashTitan]";

function getScriptPath(scriptName) {
  return path.join(SCRIPTS_DIR, scriptName);
}

function parseDiskNumber(devicePath) {
  const match = String(devicePath || "").match(/physicaldrive(\d+)/i);
  if (!match) {
    throw new Error(`FlashTitan could not determine a Windows physical disk number from ${devicePath}.`);
  }

  return Number(match[1]);
}

function detectHybridIsoSignature(imagePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(imagePath, { start: 0, end: 511 });
    const chunks = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      const header = Buffer.concat(chunks);
      if (header.length < 512) {
        resolve(false);
        return;
      }

      const hasMbrSignature = header[510] === 0x55 && header[511] === 0xaa;
      const hasPartitionEntry = [446, 462, 478, 494].some((offset) => header[offset + 4] !== 0x00);
      resolve(Boolean(hasMbrSignature && hasPartitionEntry));
    });
  });
}

function emitEvent(onEvent, payload) {
  if (typeof onEvent === "function" && payload && typeof payload === "object") {
    onEvent(payload);
  }
}

function classifyIsoFromInspection(prepared, inspection, hybrid) {
  const preparedPath = prepared.preparedPath;

  if (inspection && inspection.isWindowsInstaller) {
    const supportsFat32Only = (inspection.installWimSize || 0) <= 4 * 1024 * 1024 * 1024;
    return {
      mode: "windows-installer-usb",
      kind: "windows-installer-iso",
      message: supportsFat32Only
        ? "Windows installer ISO detected. FlashTitan will create a BIOS/UEFI bootable Windows USB."
        : "Windows installer ISO detected with a large image file. FlashTitan will split the installer image for FAT32-safe boot media.",
      prepared,
      inspection,
      guidance: "Insert the USB into the target PC, open its boot menu, and choose the USB device to start Windows Setup."
    };
  }

  if (inspection && inspection.isLikelyLinuxIso) {
    return {
      mode: "raw-write",
      kind: "linux-iso",
      message: "Linux bootable ISO detected. FlashTitan will write the ISO directly to the target device.",
      prepared,
      inspection,
      guidance: "Insert the USB into the target PC, open its boot menu, and choose the flashed drive to begin the Linux live environment or installer."
    };
  }

  if (hybrid) {
    return {
      mode: "raw-write",
      kind: "hybrid-iso",
      message: "Hybrid ISO detected. FlashTitan will write the ISO directly to the target device.",
      prepared,
      guidance: "Insert the USB into the target PC, open its boot menu, and choose the flashed drive to begin the OS installer."
    };
  }

  return {
    mode: "unsupported",
    kind: "non-bootable-or-unknown-iso",
    message:
      "This ISO does not look like a Windows installer, Linux bootable ISO, or hybrid raw-write image, so FlashTitan cannot make it bootable safely yet.",
    prepared
  };
}

function runPowerShellScript(scriptName, args, onEvent, controller) {
  return new Promise((resolve, reject) => {
    const scriptPath = getScriptPath(scriptName);
    const child = spawn(
      POWERSHELL_EXE,
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
      { windowsHide: true }
    );

    if (controller && typeof controller === "object") {
      controller.childProcess = child;
      controller.abort = () => {
        if (!child.killed) {
          child.kill();
        }
      };
    }

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let finalResult = null;
    let cancelled = false;

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith(JSON_EVENT_PREFIX)) {
          continue;
        }

        const payload = JSON.parse(line.slice(JSON_EVENT_PREFIX.length));
        if (payload.type === "result") {
          finalResult = payload.data;
        } else {
          emitEvent(onEvent, payload);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      cancelled = signal !== null;
      if (cancelled) {
        reject(new Error("Operation cancelled. Reconnect the media and re-run the flash if it is left in an unknown state."));
        return;
      }

      if (code !== 0) {
        reject(new Error(stderrBuffer.trim() || `PowerShell media operation failed with exit code ${code}.`));
        return;
      }

      resolve(finalResult);
    });
  });
}

async function inspectIso(imagePath) {
  return runPowerShellScript("inspect-iso.ps1", ["-IsoPath", imagePath]);
}

async function listWindowsDeviceMetadata() {
  if (process.platform !== "win32") {
    return [];
  }

  const raw = await runPowerShellScript("list-devices.ps1", []);
  return Array.isArray(raw) ? raw : [];
}

async function classifyImage(imagePath) {
  const prepared = await prepareFlashableImage(imagePath);
  const extension = path.extname(prepared.preparedPath).toLowerCase();

  if (extension === ".img") {
    return {
      mode: "raw-write",
      kind: "disk-image",
      message: prepared.extracted
        ? `Archive extracted successfully. FlashTitan will write ${path.basename(prepared.preparedPath)} directly to the removable device.`
        : "IMG images are written directly to the selected removable device.",
      prepared,
      guidance: "Boot the target PC from the USB drive and follow the OS installer or first-boot setup prompts."
    };
  }

  const inspection = await inspectIso(prepared.preparedPath);
  const hybrid = await detectHybridIsoSignature(prepared.preparedPath);
  return classifyIsoFromInspection(prepared, inspection, hybrid);
}

function getChunkSizeForProfile(performanceProfile, preferredChunkSizeMiB) {
  const explicit = Math.max(1, Math.min(32, Number(preferredChunkSizeMiB) || 4));
  if (performanceProfile === "safe") {
    return Math.min(explicit, 2);
  }
  if (performanceProfile === "fast") {
    return Math.max(explicit, 8);
  }
  return explicit;
}

async function writeRawImage(imagePath, devicePath, options, onEvent, controller) {
  const diskNumber = parseDiskNumber(devicePath);
  const verifyMode = options.verificationMode === "quick" ? "quick" : "full";
  const chunkSizeMiB = getChunkSizeForProfile(options.performanceProfile, options.preferredChunkSizeMiB);

  return runPowerShellScript(
    "write-raw-image.ps1",
    [
      "-SourcePath",
      imagePath,
      "-DiskNumber",
      String(diskNumber),
      "-VerifyMode",
      verifyMode,
      "-ChunkSizeMiB",
      String(chunkSizeMiB)
    ],
    onEvent,
    controller
  );
}

async function createWindowsInstallerUsb(imagePath, devicePath, options, onEvent, controller) {
  const diskNumber = parseDiskNumber(devicePath);
  const verifyMode = options.verificationMode === "quick" ? "quick" : "full";

  return runPowerShellScript(
    "create-windows-installer-usb.ps1",
    [
      "-IsoPath",
      imagePath,
      "-DiskNumber",
      String(diskNumber),
      "-VerifyMode",
      verifyMode
    ],
    onEvent,
    controller
  );
}

function getWriterAvailability() {
  return {
    approved: process.platform === "win32",
    mode: process.platform === "win32" ? "native-windows-engine" : "unsupported-platform",
    message:
      process.platform === "win32"
        ? "Native Windows flashing engine is available. Run FlashTitan as Administrator before writing media."
        : "FlashTitan media creation is only implemented for Windows in this build."
  };
}

module.exports = {
  __test: {
    classifyIsoFromInspection
  },
  classifyImage,
  createWindowsInstallerUsb,
  getWriterAvailability,
  listWindowsDeviceMetadata,
  writeRawImage
};
