const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../support-bundle");

test("summarizeResult keeps verification and Windows split-image details", () => {
  const summary = __test.summarizeResult([
    {
      target: {
        name: "USB Drive",
        path: "\\\\.\\PhysicalDrive3"
      },
      result: {
        mode: "windows-installer-usb",
        verifyMode: "full",
        usedSplitImage: true,
        targetRoot: "E:",
        verificationReport: null,
        guidance: "Boot from USB.",
        classification: {
          mode: "windows-installer-usb",
          kind: "windows-installer-iso",
          message: "Windows installer detected.",
          prepared: {
            archiveType: null,
            extracted: false
          }
        }
      }
    },
    {
      target: {
        name: "SD Card",
        path: "\\\\.\\PhysicalDrive4"
      },
      result: {
        mode: "raw-write",
        verifyMode: "quick",
        verificationReport: {
          mode: "quick",
          mismatchOffset: null
        },
        guidance: "Boot from SD.",
        classification: {
          mode: "raw-write",
          kind: "linux-iso",
          message: "Linux ISO detected.",
          prepared: {
            archiveType: ".xz",
            extracted: true
          }
        }
      }
    }
  ]);

  assert.equal(summary.length, 2);
  assert.equal(summary[0].usedSplitImage, true);
  assert.equal(summary[0].targetRoot, "E:");
  assert.equal(summary[1].verificationReport.mode, "quick");
  assert.equal(summary[1].classification.archiveType, ".xz");
  assert.equal(summary[1].classification.extracted, true);
});
