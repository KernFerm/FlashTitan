const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { validateDeviceSelection } = require("../device-safety");
const { classifyImage } = require("../windows-media");

async function withTempDir(run) {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "flashtitan-dummy-image-"));
  try {
    return await run(tempRoot);
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

test("dummy image smoke test validates a fake removable USB target without writing", async () => {
  await withTempDir(async (tempRoot) => {
    const dummyImagePath = path.join(tempRoot, "dummy-linux.img");
    await fs.promises.writeFile(dummyImagePath, Buffer.alloc(1024 * 64, 0xaa));

    const classification = await classifyImage(dummyImagePath);
    assert.equal(classification.mode, "raw-write");
    assert.equal(classification.kind, "disk-image");
    assert.match(classification.message, /written directly/i);

    const target = validateDeviceSelection({
      id: "usb-dummy",
      name: "Dummy USB Drive",
      path: "\\\\.\\PhysicalDrive9",
      size: 16 * 1024 * 1024 * 1024,
      removable: true,
      system: false,
      internal: false,
      blocked: false,
      type: "USB",
      warnings: []
    });

    assert.equal(target.removable, true);
    assert.equal(target.path, "\\\\.\\PhysicalDrive9");
  });
});
