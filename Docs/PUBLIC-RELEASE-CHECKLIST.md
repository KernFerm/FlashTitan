# FlashTitan Public Release Checklist

Use this before describing FlashTitan as a public production application.

## Reliability

- Verify Windows 10 installer ISO creation on real hardware.
- Verify Windows 11 installer ISO creation on real hardware.
- Verify at least three common Linux ISOs on real hardware.
- Verify both BIOS and UEFI boot on real target machines.
- Verify one cancellation case and one recovery case on removable media.
- Verify one quick-check and one full-check flash flow end to end.
- Verify the current three-stage UI correctly enables `Flash!` only when an image and safe removable target are ready.

## Safety

- Confirm internal drives stay blocked in the normal picker.
- Confirm Administrator-only write behavior still works.
- Confirm mismatches, disconnects, and lock conflicts show clear recovery steps.
- Confirm support bundles include useful flash, device, and runtime context.
- Confirm copied diagnostics do not expose surprises beyond the expected troubleshooting data.

## Packaging

- Install on a clean Windows machine.
- Confirm uninstall works cleanly.
- Confirm reinstall and upgrade work cleanly.
- Confirm shortcuts and Start Menu entries behave correctly.
- Sign release builds before public distribution.

## Support

- Keep `README.md` accurate for the current release.
- Keep known limitations visible and honest.
- Keep screenshots current.
- Publish release notes for every version.
- Keep a simple bug-report path with logs, copied diagnostics, or support bundle guidance.

## Minimum honesty bar

Do not describe FlashTitan as fully production-ready until the real-device matrix is documented and repeatable.
