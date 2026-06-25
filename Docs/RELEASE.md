# FlashTitan Release Notes

## Current version `0.0.47`

> Dependency Update

### User-facing changes

- Etcher-style three-stage flow centered around picking an image, selecting a removable USB drive, and clicking `Flash!`
- Friendlier device cards and final warning text for normal users
- Progress display moved into the main workflow with a clearer status area
- Copyable diagnostics plus richer support bundles for troubleshooting
- Better completion, recovery, and verification wording

### Technical changes

- refreshed packaged dependency versions and regenerated the lockfile for the `0.0.47` release line
- updated the Electron toolchain to `electron@^42.5.0`, `electron-builder@^26.15.3`, and `javascript-obfuscator@^5.4.3`
- safer removable-drive auto-selection when exactly one valid USB target is present
- stronger removable-drive validation before writes begin
- generic bootable ISO fallback now routes to raw-write when BIOS or UEFI boot signals are detected
- verification mismatch reporting now includes more precise offset information when available
- preload bridge is more fault-tolerant during startup
- added a dummy-image smoke test that exercises the non-destructive classification and target-validation path


### Test status

Current automated test status:

- `32/32` tests passing

### License

- FlashTitan is open source under the Apache License 2.0

## Historical release notes

- [0.0.27-RELEASE.md](0.0.27-RELEASE.md)

## Release contents

A normal Windows release should include:

- `FlashTitan-<version>-Installer.exe`
- packaged app output for Windows
- license agreement page
- safety acknowledgment page

## Known follow-up work

- code signing
- broader real hardware validation
- cleaner release distribution polish
- more tested-image and tested-hardware coverage
