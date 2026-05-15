const fs = require("fs");
const path = require("path");

let logsDirectory = null;
let currentLogFilePath = null;

function initializeLogStore(baseDirectory) {
  logsDirectory = path.join(baseDirectory, "logs");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  currentLogFilePath = path.join(logsDirectory, `flashtitan-${stamp}.log`);
}

function ensureInitialized() {
  if (!logsDirectory || !currentLogFilePath) {
    throw new Error("Log store has not been initialized.");
  }
}

async function appendLogEntry(entry) {
  ensureInitialized();
  await fs.promises.mkdir(logsDirectory, { recursive: true });
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry
  });
  await fs.promises.appendFile(currentLogFilePath, `${line}\n`, "utf8");
}

async function pruneLogs(retentionDays) {
  ensureInitialized();
  await fs.promises.mkdir(logsDirectory, { recursive: true });
  const entries = await fs.promises.readdir(logsDirectory, { withFileTypes: true });
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
      .map(async (entry) => {
        const fullPath = path.join(logsDirectory, entry.name);
        const stats = await fs.promises.stat(fullPath);
        if (stats.mtimeMs < cutoff) {
          await fs.promises.unlink(fullPath);
        }
      })
  );
}

function getCurrentLogFilePath() {
  ensureInitialized();
  return currentLogFilePath;
}

module.exports = {
  appendLogEntry,
  getCurrentLogFilePath,
  initializeLogStore,
  pruneLogs
};
