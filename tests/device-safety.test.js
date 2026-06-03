const test = require("node:test");
const assert = require("node:assert/strict");

const { buildDeviceRecord, validateDeviceSelection, validateDeviceSelections } = require("../device-safety");

test("buildDeviceRecord marks internal non-removable drives as blocked", () => {
  const record = buildDeviceRecord(
    {
      description: "Internal SSD",
      busType: "SATA",
      device: "\\\\.\\PhysicalDrive0",
      mountpoints: [{ path: "C:\\" }],
      isSystem: true,
      isRemovable: false,
      size: 512 * 1024 * 1024 * 1024
    },
    new Map(),
    { systemDrive: "C:" }
  );

  assert.equal(record.removable, false);
  assert.equal(record.system, true);
  assert.equal(record.internal, true);
  assert.equal(record.blocked, true);
  assert.match(record.badges.join(" "), /System Drive Protected/);
});

test("buildDeviceRecord marks removable drives mounted on the system drive as blocked", () => {
  const record = buildDeviceRecord(
    {
      description: "Odd USB",
      busType: "USB",
      device: "\\\\.\\PhysicalDrive5",
      mountpoints: [{ path: "C:\\" }],
      isSystem: false,
      isRemovable: true,
      size: 16 * 1024 * 1024 * 1024
    },
    new Map(),
    { systemDrive: "C:" }
  );

  assert.equal(record.removable, true);
  assert.equal(record.system, true);
  assert.equal(record.blocked, true);
});

test("buildDeviceRecord accepts USB bus devices even when drivelist does not mark them removable", () => {
  const metadataMap = new Map([
    [
      "\\\\.\\PhysicalDrive7",
      {
        path: "\\\\.\\PhysicalDrive7",
        friendlyName: "USB Flash Disk",
        busType: "USB",
        healthStatus: "Healthy",
        serialNumber: "ABC123"
      }
    ]
  ]);

  const record = buildDeviceRecord(
    {
      description: "USB Flash Disk",
      busType: "USB",
      device: "\\\\.\\PhysicalDrive7",
      mountpoints: [{ path: "E:\\" }],
      isSystem: false,
      isRemovable: false,
      size: 32 * 1024 * 1024 * 1024
    },
    metadataMap,
    { systemDrive: "C:" }
  );

  assert.equal(record.removable, true);
  assert.equal(record.internal, false);
  assert.equal(record.blocked, false);
});

test("validateDeviceSelection accepts a normal removable target", () => {
  const target = validateDeviceSelection({
    id: "usb-1",
    name: "USB Drive",
    path: "\\\\.\\PhysicalDrive4",
    size: 32 * 1024 * 1024 * 1024,
    removable: true,
    system: false,
    internal: false,
    blocked: false,
    type: "USB",
    warnings: []
  });

  assert.equal(target.id, "usb-1");
  assert.equal(target.removable, true);
});

test("validateDeviceSelection rejects blocked internal or system targets", () => {
  assert.throws(
    () =>
      validateDeviceSelection({
        id: "disk-0",
        name: "Internal SSD",
        path: "\\\\.\\PhysicalDrive0",
        removable: false,
        system: true,
        internal: true,
        blocked: true
      }),
    /blocked by FlashTitan safety rules/i
  );
});

test("validateDeviceSelection permanently blocks drive C", () => {
  assert.throws(
    () =>
      validateDeviceSelection({
        id: "bad",
        name: "C Drive",
        path: "C:\\",
        removable: true,
        system: false,
        internal: false,
        blocked: false
      }),
    /Drive C: is permanently blocked/i
  );
});

test("validateDeviceSelections rejects duplicate removable targets", () => {
  assert.throws(
    () =>
      validateDeviceSelections([
        {
          id: "usb-1",
          name: "USB 1",
          path: "\\\\.\\PhysicalDrive4",
          removable: true,
          system: false,
          internal: false,
          blocked: false
        },
        {
          id: "usb-2",
          name: "USB 2",
          path: "\\\\.\\PhysicalDrive4",
          removable: true,
          system: false,
          internal: false,
          blocked: false
        }
      ]),
    /Duplicate removable devices were selected/i
  );
});
