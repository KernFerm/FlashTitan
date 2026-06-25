const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../windows-media");

test("classifyIsoFromInspection keeps Windows installer workflow intact", () => {
  const prepared = {
    preparedPath: "C:\\images\\windows.iso",
    extracted: false
  };

  const result = __test.classifyIsoFromInspection(
    prepared,
    {
      isWindowsInstaller: true,
      installWimSize: 1024
    },
    false
  );

  assert.equal(result.mode, "windows-installer-usb");
  assert.equal(result.kind, "windows-installer-iso");
});

test("classifyIsoFromInspection accepts Linux ISOs even without a hybrid MBR signature", () => {
  const prepared = {
    preparedPath: "C:\\images\\antix.iso",
    extracted: false
  };

  const result = __test.classifyIsoFromInspection(
    prepared,
    {
      isWindowsInstaller: false,
      isLikelyLinuxIso: true
    },
    false
  );

  assert.equal(result.mode, "raw-write");
  assert.equal(result.kind, "linux-iso");
});

test("classifyIsoFromInspection still accepts generic hybrid ISOs", () => {
  const prepared = {
    preparedPath: "C:\\images\\hybrid.iso",
    extracted: false
  };

  const result = __test.classifyIsoFromInspection(
    prepared,
    {
      isWindowsInstaller: false,
      isLikelyLinuxIso: false
    },
    true
  );

  assert.equal(result.mode, "raw-write");
  assert.equal(result.kind, "hybrid-iso");
});

test("classifyIsoFromInspection falls back to raw-write for other bootable ISOs", () => {
  const prepared = {
    preparedPath: "C:\\images\\rescue.iso",
    extracted: false
  };

  const result = __test.classifyIsoFromInspection(
    prepared,
    {
      isWindowsInstaller: false,
      isLikelyLinuxIso: false,
      supportsBiosBoot: true,
      supportsUefiBoot: false
    },
    false
  );

  assert.equal(result.mode, "raw-write");
  assert.equal(result.kind, "generic-bootable-iso");
});

test("classifyIsoFromInspection rejects unknown non-bootable ISO layouts", () => {
  const prepared = {
    preparedPath: "C:\\images\\unknown.iso",
    extracted: false
  };

  const result = __test.classifyIsoFromInspection(
    prepared,
    {
      isWindowsInstaller: false,
      isLikelyLinuxIso: false
    },
    false
  );

  assert.equal(result.mode, "unsupported");
});
