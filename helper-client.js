const path = require("path");
const { fork } = require("child_process");

function startFlashHelper(payload, onEvent) {
  const child = fork(path.join(__dirname, "helper-runner.js"), [], {
    stdio: ["pipe", "pipe", "pipe", "ipc"]
  });

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const promise = new Promise((resolve, reject) => {
    child.on("message", (message) => {
      if (!message || message.id !== requestId) {
        return;
      }

      if (message.type === "flash:event") {
        if (typeof onEvent === "function") {
          onEvent(message.event);
        }
        return;
      }

      if (message.type === "flash:result") {
        resolve(message.result);
        child.disconnect();
        return;
      }

      if (message.type === "flash:error") {
        reject(new Error(message.error || "Helper flash operation failed."));
        child.disconnect();
      }
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code !== 0 && signal !== "SIGTERM") {
        reject(new Error(`Flash helper exited unexpectedly with code ${code ?? "unknown"}.`));
      }
    });
  });

  child.send({
    type: "flash:start",
    id: requestId,
    payload
  });

  return {
    promise,
    abort: () => {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    }
  };
}

module.exports = {
  startFlashHelper
};
