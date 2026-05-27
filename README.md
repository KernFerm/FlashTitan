# FlashTitan ⚡

FlashTitan is a Windows-first bootable media app for turning operating system images into bootable USB drives and SD cards.

It is built for two kinds of people:

- everyday users who want a simpler, safer flashing flow 🙂
- technical users who still want checks, logs, presets, and diagnostics 🛠️

### Help make the project better
[Contribute](https://github.com/KernFerm/FlashTitan/blob/main/CONTRIBUTING.md)

### Download FlashTitan Installer
[FlashTitan](https://github.com/KernFerm/FlashTitan/releases/download/V0028-FlashTitan/FlashTitan-0.0.28-Installer.exe)

## What FlashTitan does ✨

- opens local image files like `.iso` and `.img`
- downloads image files from direct links
- includes an official preset catalog for Linux, ARM, and Windows sources
- writes supported images to removable USB drives and SD cards
- verifies images and completed writes
- warns clearly before anything is erased
- creates logs and support bundles for troubleshooting

## Platform support 🪟

FlashTitan currently targets:

- Windows 10
- Windows 11

## Supported image formats 💾

- `.iso`
- `.img`
- `.zip`
- `.xz`
- `.gz`

Important note:

- `.iso` and `.img` are handled directly
- `.zip`, `.xz`, and `.gz` are supported when they contain a flashable `.iso` or `.img`

## Main flow 🧡

FlashTitan is designed around a simple first-run flow:

1. Choose your image
2. Choose your USB drive
3. Review the warning
4. Type `CONFIRM`
5. Click `Make Bootable Drive`

The UI keeps the advanced fields out of the way unless you ask for them.

## How to use FlashTitan 🚀

### Quick start ✅

1. Open FlashTitan as Administrator
2. Click `Choose Image`
3. Pick an `.iso`, `.img`, or supported archive
4. Click `Refresh USB Drives` if your removable drive does not show up right away
5. Select the removable drive you want to erase
6. Review the safety check
7. Type `CONFIRM`
8. Click `Make Bootable Drive`
9. Wait for the write and verification to finish
10. Boot the target computer from the USB drive

### Using presets 🌐

FlashTitan includes an official preset list for common downloads.

1. Open the `Official image list`
2. Choose a preset
3. Click `Use Preset`
4. If FlashTitan can download the file directly, use `Download Image`
5. If the preset opens the vendor page instead, download the image there and bring it back into FlashTitan

### Advanced options 🛠️

Advanced fields live behind the `Advanced` toggle. That area is for:

- manual download links
- optional checksum entry
- extra testing and troubleshooting details

## Image handling overview 🧭

### Friendly version 🙂

- Windows installer ISOs use a Windows-specific USB creation path
- Linux and hybrid bootable ISOs are usually written directly
- `.img` files are written directly
- supported archives are unpacked first, then the flashable image is used

### Technical version 🤓

- Windows installer ISOs route into a native Windows installer-media workflow
- Linux ISOs, hybrid ISOs, and `.img` files route into raw-write flashing
- archive handling happens before image classification
- verification supports quick and full modes

## Safety features 🛡️

- normal target picker shows removable media only
- internal and likely system drives are blocked from the normal flow
- typed `CONFIRM` is required before destructive writes
- suspicious devices show warnings
- real write operations require Administrator rights
- cancellation and recovery guidance are built in

## Security features 🔐

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- preload-only desktop bridge
- IPC allowlist and payload sanitization
- blocked arbitrary navigation and popup behavior

## Preset catalog 📚

FlashTitan includes a broad preset catalog for common official downloads across:

- Linux desktop and installer images
- ARM images
- Raspberry Pi images
- Windows download pages and installer sources
- rescue and utility images

Some presets are direct-download friendly. Others intentionally open the official vendor page because the upstream download URLs change too often to pin safely.

## Installation 📦

### Recommended

Use the Windows installer:

- `FlashTitan-<version>-Installer.exe`

This gives you the easiest setup path, shortcuts, and the normal installer flow.

### Portable packaged app 🧪

You can also run:

- `dist/win-unpacked/FlashTitan.exe`

This is useful for testing and local packaging checks.

## Run from source 👩‍💻

### Install dependencies

```bash
npm install
```

### Start in development

```bash
npm start
```

### Build packaged output

```bash
npm run pack
```

### Build Windows installer

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Project status ⚠️

FlashTitan is functional, but it is still a project that benefits from more real hardware validation.

Current known limits:

- some unusual ISOs may still be rejected if they do not look like known bootable media
- real-world reliability still depends on Windows drive access behavior
- archive extraction depends on the bundled 7-Zip tooling
- the flashing engine is Windows-only in this build
- code signing and custom release icons are still on the roadmap

## Logs and support bundles 🧰

FlashTitan can:

- open the logs folder
- keep persistent logs
- create support bundles with troubleshooting details

These are especially helpful when testing new images or diagnosing failed writes.

## Raspberry Pi note 🍓

FlashTitan can open Raspberry Pi USB boot documentation, but it does not change Raspberry Pi firmware, EEPROM, or boot order automatically.

## Open source license 📄

FlashTitan is open source under the Apache License 2.0.

- [LICENSE](LICENSE)

## Documentation 📚

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [RELEASE.md](RELEASE.md)
- [ARCHITECT.md](ARCHITECT.md)
- [PRIVACY.md](PRIVACY.md)
- [TEST-MATRIX.md](TEST-MATRIX.md)
- [BEAT-ETCHER-CHECKLIST.md](BEAT-ETCHER-CHECKLIST.md)

## Current version 🏷️

Current app version: `0.0.25`
