const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { path7za } = require("7zip-bin");

const FLASHABLE_EXTENSIONS = new Set([".iso", ".img"]);
const SUPPORTED_ARCHIVE_EXTENSIONS = new Set([".zip", ".xz", ".gz"]);

function sanitizeSegment(value) {
  return String(value || "image").replace(/[^a-z0-9._-]/gi, "-").slice(0, 80);
}

function run7Zip(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(path7za, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `7-Zip exited with code ${code}.`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function collectFlashableFiles(rootDirectory) {
  const stack = [rootDirectory];
  const matches = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (FLASHABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        matches.push(fullPath);
      }
    }
  }

  matches.sort((left, right) => left.localeCompare(right));
  return matches;
}

function toRelativeCandidates(rootDirectory, filePaths) {
  return filePaths.map((item) => path.relative(rootDirectory, item) || path.basename(item));
}

function parseArchiveListing(output) {
  const entries = [];
  const blocks = String(output || "").split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (!lines.length) {
      continue;
    }

    if (lines.some((line) => line.startsWith("Type = "))) {
      continue;
    }

    const pathLine = lines.find((line) => line.startsWith("Path = "));
    const folderLine = lines.find((line) => line.startsWith("Folder = "));
    if (!pathLine || folderLine === "Folder = +" || folderLine === "Folder = 1") {
      continue;
    }

    const entryPath = pathLine.slice("Path = ".length).trim();
    if (!entryPath || entryPath === "[Content_Types].xml") {
      continue;
    }

    entries.push(entryPath);
  }

  return entries;
}

async function previewArchiveContents(imagePath) {
  const extension = path.extname(imagePath).toLowerCase();
  if (!SUPPORTED_ARCHIVE_EXTENSIONS.has(extension)) {
    return null;
  }

  const output = await run7Zip(["l", "-slt", imagePath]);
  const entries = parseArchiveListing(output);
  if (entries.length === 0 && [".xz", ".gz"].includes(extension)) {
    entries.push(path.basename(imagePath, extension));
  }
  const flashableCandidates = entries.filter((item) => FLASHABLE_EXTENSIONS.has(path.extname(item).toLowerCase()));

  return {
    archiveType: extension,
    entryCount: entries.length,
    sampleEntries: entries.slice(0, 8),
    flashableCandidates
  };
}

async function prepareFlashableImage(imagePath) {
  const extension = path.extname(imagePath).toLowerCase();
  if (FLASHABLE_EXTENSIONS.has(extension)) {
    return {
      sourcePath: imagePath,
      preparedPath: imagePath,
      extracted: false,
      archiveType: null,
      archiveCandidates: []
    };
  }

  if (!SUPPORTED_ARCHIVE_EXTENSIONS.has(extension)) {
    throw new Error(`FlashTitan cannot prepare ${extension} archives yet.`);
  }

  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "flashtitan-archive-"));
  const outputDirectory = path.join(tempRoot, sanitizeSegment(path.basename(imagePath, extension)));
  await fs.promises.mkdir(outputDirectory, { recursive: true });

  await run7Zip(["x", "-y", `-o${outputDirectory}`, imagePath]);
  const flashableFiles = await collectFlashableFiles(outputDirectory);
  const archiveCandidates = toRelativeCandidates(outputDirectory, flashableFiles);

  if (flashableFiles.length === 0) {
    throw new Error(
      `FlashTitan unpacked ${path.basename(imagePath)} but did not find a flashable .iso or .img inside it. ` +
        "If this archive contains folders, documents, or multiple layers of compression, unpack it manually first."
    );
  }

  if (flashableFiles.length > 1) {
    const shownCandidates = archiveCandidates.slice(0, 5).join(", ");
    throw new Error(
      `FlashTitan found more than one flashable image inside ${path.basename(imagePath)}: ${shownCandidates}. ` +
        "Please unpack the archive yourself and choose the exact .iso or .img you want to write."
    );
  }

  return {
    sourcePath: imagePath,
    preparedPath: flashableFiles[0],
    extracted: true,
    archiveType: extension,
    extractionRoot: outputDirectory,
    archiveCandidates
  };
}

module.exports = {
  __test: {
    collectFlashableFiles,
    parseArchiveListing,
    toRelativeCandidates
  },
  previewArchiveContents,
  prepareFlashableImage
};
