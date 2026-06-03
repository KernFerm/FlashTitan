const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { path7za } = require("7zip-bin");

const { __test, prepareFlashableImage, previewArchiveContents } = require("../archive-utils");
const { downloadFile } = require("../download-utils");

function run7Zip(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(path7za, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `7-Zip exited with code ${code}.`));
        return;
      }
      resolve();
    });
  });
}

async function withTempDir(run) {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "flashtitan-archive-test-"));
  try {
    return await run(tempRoot);
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

async function createArchive(tempRoot, extension) {
  const sourceImage = path.join(tempRoot, "sample.img");
  await fs.promises.writeFile(sourceImage, "flashable-image");
  const archiveFileName = extension === ".zip" ? "sample.zip" : `sample.img${extension}`;
  const archivePath = path.join(tempRoot, archiveFileName);

  if (extension === ".zip") {
    await run7Zip(["a", "-tzip", archivePath, sourceImage]);
  } else if (extension === ".xz") {
    await run7Zip(["a", "-txz", archivePath, sourceImage]);
  } else if (extension === ".gz") {
    await run7Zip(["a", "-tgzip", archivePath, sourceImage]);
  } else {
    throw new Error(`Unsupported test archive extension ${extension}.`);
  }

  return archivePath;
}

async function startFileServer(filePath) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);

  const server = http.createServer((request, response) => {
    if (request.url !== `/${fileName}`) {
      response.statusCode = 404;
      response.end("missing");
      return;
    }
    response.statusCode = 200;
    response.setHeader("Content-Length", String(fileBuffer.length));
    response.end(fileBuffer);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/${fileName}`;

  return {
    url,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

test("collectFlashableFiles finds .iso and .img files recursively", async () => {
  await withTempDir(async (tempRoot) => {
    const nested = path.join(tempRoot, "nested");
    await fs.promises.mkdir(nested, { recursive: true });
    await fs.promises.writeFile(path.join(tempRoot, "notes.txt"), "ignore");
    await fs.promises.writeFile(path.join(tempRoot, "boot.iso"), "iso");
    await fs.promises.writeFile(path.join(nested, "disk.img"), "img");

    const matches = await __test.collectFlashableFiles(tempRoot);
    assert.equal(matches.length, 2);
    assert.ok(matches.some((item) => item.endsWith("boot.iso")));
    assert.ok(matches.some((item) => item.endsWith("disk.img")));
  });
});

test("toRelativeCandidates converts archive matches into readable relative paths", () => {
  const root = "C:\\temp\\archive";
  const candidates = __test.toRelativeCandidates(root, [
    "C:\\temp\\archive\\boot.iso",
    "C:\\temp\\archive\\nested\\disk.img"
  ]);

  assert.deepEqual(candidates, ["boot.iso", path.join("nested", "disk.img")]);
});

test("parseArchiveListing reads 7-Zip listing output into file entries", () => {
  const parsed = __test.parseArchiveListing(`
Path = archive.zip
Type = zip

Path = sample.img
Size = 12
Folder = -

Path = docs
Folder = +

Path = nested/boot.iso
Size = 33
Folder = -
`);

  assert.deepEqual(parsed, ["sample.img", "nested/boot.iso"]);
});

for (const extension of [".zip", ".xz", ".gz"]) {
  test(`download and extraction flow works for ${extension} archives`, async () => {
    await withTempDir(async (tempRoot) => {
      const archivePath = await createArchive(tempRoot, extension);
      const server = await startFileServer(archivePath);
      const outputDirectory = path.join(tempRoot, "downloads");

      try {
        const downloaded = await downloadFile({
          url: server.url,
          outputDirectory,
          expectedChecksum: ""
        }, null, {});

        const preview = await previewArchiveContents(downloaded.path);
        assert.ok(preview);
        assert.equal(preview.archiveType, extension);
        assert.ok(preview.flashableCandidates.some((item) => item.endsWith("sample.img")));

        const prepared = await prepareFlashableImage(downloaded.path);
        assert.equal(prepared.extracted, true);
        assert.ok(prepared.preparedPath.endsWith("sample.img"));
      } finally {
        await server.close();
      }
    });
  });
}
