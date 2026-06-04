# FlashTitan ⚡

FlashTitan is a Windows app for making bootable USB drives from operating system images.

It is designed to feel simple for everyday users while still giving advanced users the checks, logs, and diagnostics they need when something goes wrong.

## Why use FlashTitan ✨

- make bootable USB drives from common OS images
- use a simple three-step flow
- stay focused on removable USB media, not internal drives
- verify finished writes for extra confidence
- collect diagnostics and support bundles when you need help

## What FlashTitan supports 🧰

### Windows versions 🪟

- Windows 10
- Windows 11

### Image formats 💿

- `.iso`
- `.img`
- `.zip`
- `.xz`
- `.gz`

Archive formats are supported when they contain a flashable `.iso` or `.img`.

## Simple flow 🚀

FlashTitan keeps the main path straightforward:

1. Choose an image
2. Choose the USB drive
3. Click `Flash!`

If only one safe removable USB drive is connected, FlashTitan can auto-select it after refresh to keep things moving.

## How to use it ✅

1. Open FlashTitan as Administrator
2. Click `Flash from file`
3. Choose your `.iso`, `.img`, or supported archive
4. Click `Refresh USB Drives` if needed
5. Make sure the selected target is your removable USB drive
6. Review the erase warning
7. Click `Flash!`
8. Wait for writing and verification to finish
9. Boot the target computer from the USB drive

## Other ways to get an image 🌐

### Use presets 📚

FlashTitan includes a preset list for common official downloads.

1. Open the preset list
2. Choose a preset
3. Click `Use preset`
4. If a direct download is available, use `Download image`
5. If the vendor page opens instead, download the image there and then bring it back into FlashTitan

### Use a direct URL 🔗

Advanced mode includes support for direct image links when you already know the source you want to use.

## Safety 🛡️

FlashTitan is built to reduce common flashing mistakes:

- removable USB drives are the normal target
- internal and likely system drives are blocked in the normal flow
- the selected drive is validated before writing starts
- clear erase warnings are shown before destructive actions
- Administrator rights are required for real writes

No flasher can guarantee boot success on every machine, so final results still depend on the target hardware and firmware settings.

## What happens with different image types 🧠

- Windows installer ISOs use a Windows-specific USB creation path
- Linux and hybrid bootable ISOs are usually written directly
- bootable ISOs with valid boot signals can still fall back to raw-write even if they do not match older signatures
- `.img` files are written directly
- supported archives are unpacked first, then the flashable image is used

## Troubleshooting and support 🧰

FlashTitan can help you troubleshoot problems with:

- persistent logs
- copied diagnostics snapshots
- support bundles with useful technical details

These tools are helpful when a flash fails, verification reports a mismatch, or you want to share a clean bug report.

## Installation 📦

### Recommended 👍

Use the Windows installer:

- `FlashTitan-<version>-Installer.exe`

### Portable packaged app 🧪

You can also run:

- `dist/win-unpacked/FlashTitan.exe`

This is mainly useful for testing and local packaging checks.

## Run from source 👩‍💻

```bash
npm install
npm start
```

Useful build commands:

```bash
npm run pack
npm run build
npm test
```

## Current status 📍

FlashTitan is working and usable, but broad public-release confidence still depends on more real hardware validation.

Current limits to keep in mind:

- real-world boot reliability still depends on Windows drive access behavior and the target hardware firmware
- some images still need wider real-device coverage before they should be called broadly proven
- archive extraction depends on the bundled 7-Zip tooling
- the flashing engine is Windows-only in this build
- code signing and broader release polish are still follow-up work

## Raspberry Pi note 🍓

FlashTitan can open Raspberry Pi USB boot documentation, but it does not change Raspberry Pi firmware, EEPROM, or boot order automatically.

## License 📄

FlashTitan is open source under the Apache License 2.0.

- [LICENSE](../LICENSE)

## Documentation 📚

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [RELEASE.md](RELEASE.md)
- [ARCHITECT.md](ARCHITECT.md)
- [PRIVACY.md](PRIVACY.md)
- [TEST-MATRIX.md](TEST-MATRIX.md)
- [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md)
- [PUBLIC-RELEASE-CHECKLIST.md](PUBLIC-RELEASE-CHECKLIST.md)

## Current version 🏷️

Current app version: `0.0.40`

## Screenshot
![flashtitan](https://github.com/KernFerm/FlashTitan/blob/main/flash-titan.png)
