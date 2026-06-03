const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");
const crypto = require("crypto");

function sanitizeUrl(rawUrl) {
  const url = new URL(String(rawUrl || ""));
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS downloads are supported.");
  }
  return url;
}

function chooseClient(protocol) {
  return protocol === "https:" ? https : http;
}

function inferFileName(url) {
  const direct = path.basename(url.pathname || "") || "downloaded-image";
  return direct.length > 1 ? direct : "downloaded-image";
}

function downloadFile({ url, outputDirectory, expectedChecksum }, onProgress, controller) {
  return new Promise((resolve, reject) => {
    const parsedUrl = sanitizeUrl(url);
    const client = chooseClient(parsedUrl.protocol);
    const fileName = inferFileName(parsedUrl);
    const destination = path.join(outputDirectory, fileName);
    const hash = crypto.createHash("sha256");

    fs.mkdirSync(outputDirectory, { recursive: true });

    const request = client.get(parsedUrl, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        resolve(downloadFile({ url: response.headers.location, outputDirectory, expectedChecksum }, onProgress, controller));
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with HTTP status ${response.statusCode}.`));
        return;
      }

      const totalBytes = Number(response.headers["content-length"] || 0);
      const fileStream = fs.createWriteStream(destination);
      let downloadedBytes = 0;
      const startedAt = Date.now();

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        hash.update(chunk);
        if (typeof onProgress === "function") {
          const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
          onProgress({
            type: "download-progress",
            stage: "downloading",
            processedBytes: downloadedBytes,
            totalBytes,
            percent: totalBytes > 0 ? Math.min((downloadedBytes / totalBytes) * 100, 100) : 0,
            speedBytesPerSecond: downloadedBytes / elapsedSeconds,
            etaSeconds: totalBytes > 0 ? (totalBytes - downloadedBytes) / (downloadedBytes / elapsedSeconds || 1) : null
          });
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", async () => {
        fileStream.close(async () => {
          const sha256 = hash.digest("hex");
          if (expectedChecksum && expectedChecksum.toLowerCase() !== sha256.toLowerCase()) {
            reject(new Error("Downloaded file checksum does not match the expected SHA256 value."));
            return;
          }

          resolve({
            path: destination,
            fileName,
            sha256
          });
        });
      });

      fileStream.on("error", reject);
    });

    controller.abort = () => request.destroy(new Error("Download cancelled."));
    request.on("error", reject);
  });
}

module.exports = {
  downloadFile
};
