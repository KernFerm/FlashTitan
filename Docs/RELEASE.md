# FlashTitan Release Notes

![Current Version](https://img.shields.io/badge/current-0.0.70-blue)
![Release Status](https://img.shields.io/badge/release-Windows%20packaging-informational)
![Tests](https://img.shields.io/badge/tests-32%2F32%20passing-success)

## Current version `0.0.70`

> Documentation and packaging alignment update

### User-facing changes

- kept the Etcher-style three-step flow centered on choosing an image, choosing a removable target, and clicking `Flash!`
- continued support for official presets, direct download URLs, copied diagnostics, and support bundles
- clearer Administrator guidance for real write operations and removable-media safety expectations

### Technical changes

- bumped the application version to `0.0.70`
- current packaged toolchain is `electron@^43.2.0`, `electron-builder@^26.15.3`, and `javascript-obfuscator@^5.5.0`
- current runtime dependencies include `drivelist@^12.0.2` and `7zip-bin@^5.2.0`
- Windows packaging supports both standard and protected release flows through `npm run build`, `npm run dist:win`, and `npm run dist:protected`
- installer artifacts are produced as `FlashTitan-<version>-Installer.exe`

### Test status

Current automated test status:

- `npm test`
- `32/32` tests passing

### Release contents

A normal Windows release should include:

- `FlashTitan-<version>-Installer.exe`
- packaged Windows app output
- license agreement page
- safety acknowledgment page

### Known follow-up work

- code signing
- broader real-hardware validation
- cleaner public release distribution polish
- more tested-image and tested-hardware coverage

## Historical release notes

- [0.0.27-RELEASE.md](0.0.27-RELEASE.md)
