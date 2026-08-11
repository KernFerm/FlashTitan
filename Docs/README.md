

# FlashTitan

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6)
![Tests](https://img.shields.io/badge/tests-32%2F32%20passing-success)
![License](https://img.shields.io/badge/license-Apache%202.0-green)

FlashTitan is a Windows-first Electron app for safely creating bootable USB and SD media from operating system images.

It is designed to stay approachable for everyday users while still giving advanced users the validation, logs, and diagnostics they need when something goes wrong.

## Why use FlashTitan

- create bootable removable media from common OS images
- use a focused three-step flow
- keep the normal path centered on removable targets, not internal drives
- verify completed writes for added confidence
- collect diagnostics and support bundles when troubleshooting

## Platform and format support

### Supported host OS

- Windows 10
- Windows 11

### Supported image inputs

- `.iso`
- `.img`
- `.zip`
- `.xz`
- `.gz`

Archive formats are supported when they contain a flashable `.iso` or `.img`.

## Main workflow

FlashTitan keeps the primary path simple:

1. Choose an image
2. Choose the removable target
3. Click `Flash!`

If exactly one safe removable device is connected after refresh, FlashTitan can auto-select it to reduce extra clicks.

## Basic usage

1. Open FlashTitan as Administrator
2. Click `Flash from file`
3. Choose an `.iso`, `.img`, or supported archive
4. Click `Refresh USB Drives` if needed
5. Confirm the selected target is your removable device
6. Review the erase warning
7. Click `Flash!`
8. Wait for writing and verification to finish
9. Boot the target machine from the prepared media

## Other image sources

### Official presets

FlashTitan includes an official preset catalog for common downloads.

1. Open the preset list
2. Choose a preset
3. Click `Use preset`
4. If a direct download is available, use `Download image`
5. If the vendor page opens instead, download the image there and then load it back into FlashTitan

### Direct download URL

Advanced use also supports pasting a direct image URL when you already know the source you want.

## Safety model

FlashTitan is built to reduce common flashing mistakes:

- removable media is the intended target in the normal flow
- internal and likely system drives are blocked in the normal picker
- the selected target is validated before writing starts
- destructive actions are preceded by explicit warnings
- real write operations require Administrator rights on Windows

No flasher can guarantee boot success on every machine, so final results still depend on the target hardware, firmware, and image quality.

## Image handling behavior

- Windows installer ISOs use the Windows-specific creation path
- Linux and hybrid bootable ISOs are usually written directly
- other bootable ISOs can fall back to `raw-write` when BIOS or UEFI boot signals are detected
- `.img` files are written directly
- supported archives are extracted first and then flashed from the contained image

## Diagnostics and troubleshooting

FlashTitan includes tools that help when a flash fails or a result needs review:

- persistent logs
- copied diagnostics snapshots
- support bundles with useful technical details

These are useful for verification mismatches, failed writes, and clean bug reports.

## Installation

### Recommended installer

Use the packaged Windows installer:

- `FlashTitan-0.1.0-Installer.exe`

This is the file most end users should download and run.

### Packaged app output

You can also run the unpacked Windows build:

- `dist/win-unpacked/FlashTitan.exe`

This is mainly useful for packaging checks and local validation.

## Run from source

```bash
npm install
npm start
```

Useful project commands:

```bash
npm test
npm run pack
npm run build
npm run pack:protected
npm run dist:protected
```

## Current status

FlashTitan is usable today, but broad public-release confidence still depends on wider real-hardware validation.

Current limits to keep in mind:

- real-world boot reliability still depends on Windows drive behavior and target firmware
- some images still need wider device coverage before they should be treated as broadly proven
- archive extraction depends on bundled `7zip-bin` tooling
- code signing is still follow-up work
- the flashing engine in this repo is Windows-only

## Raspberry Pi note

FlashTitan can point users to Raspberry Pi USB boot guidance, but it does not change Raspberry Pi firmware, EEPROM, or boot order automatically.

## License

FlashTitan is open source under the Apache License 2.0.

- [LICENSE](../LICENSE)

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [RELEASE.md](RELEASE.md)
- [ARCHITECT.md](ARCHITECT.md)
- [PRIVACY.md](PRIVACY.md)
- [TEST-MATRIX.md](TEST-MATRIX.md)
- [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md)
- [PUBLIC-RELEASE-CHECKLIST.md](PUBLIC-RELEASE-CHECKLIST.md)

## Current version

Current app version: `0.1.0`
