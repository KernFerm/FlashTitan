# FlashTitan Roadmap

This roadmap tracks the work needed to make FlashTitan stronger, safer, easier to trust, and more polished for real-world use.

## 1. Make the main flow even simpler

- [x] Reduce the first screen to the three main actions:
  - choose image
  - choose USB drive
  - make bootable drive
- [x] Hide advanced fields behind an `Advanced` toggle
- [x] Hide checksum inputs unless the user asks for them or the preset requires them
- [x] Keep logs, support bundle tools, and Raspberry Pi help collapsed by default
- [x] Reduce busy text on the first screen
- [x] Make the status area easier to understand at a glance

## 2. Prove real-world reliability

- [ ] Test on Windows 10
- [ ] Test on Windows 11
- [ ] Test on multiple USB flash drive brands and sizes
- [ ] Test on SD cards and USB-attached card readers
- [ ] Test BIOS-only boot
- [ ] Test UEFI boot
- [ ] Test Secure Boot-friendly cases where expected
- [ ] Test on old hardware
- [ ] Test on newer hardware
- [ ] Document pass/fail results in `TEST-MATRIX.md`

## 3. Strengthen Windows ISO handling

- [ ] Confirm Windows 10 installer ISO workflow works end to end
- [ ] Confirm Windows 11 installer ISO workflow works end to end
- [ ] Test large `install.wim` split path
- [ ] Test `install.esd` export/split path
- [ ] Validate BIOS and UEFI boot files after creation
- [ ] Add clearer post-flash Windows boot instructions

## 4. Make Linux support feel trustworthy

- [ ] Test common Ubuntu images
- [ ] Test Debian images
- [ ] Test Fedora images
- [ ] Test Linux Mint images
- [ ] Test Arch-based images
- [ ] Test antiX and older-hardware-friendly images
- [ ] Test rescue and utility images like Clonezilla
- [ ] Improve unsupported-image messaging
- [ ] Add more per-distro boot guidance where helpful

## 5. Improve archive handling

- [x] Verify `.zip` extraction path on real downloads
- [x] Verify `.xz` extraction path on real downloads
- [x] Verify `.gz` extraction path on real downloads
- [x] Improve error messages when no flashable image is found inside an archive
- [x] Consider archive content preview before extraction
- [x] Consider choosing between multiple `.iso` or `.img` files inside one archive

Current safe behavior:
FlashTitan stops and asks the user to unpack the archive manually if more than one flashable image is found.

## 6. Harden failure recovery

- [x] Improve handling when a device disconnects mid-write
- [x] Improve handling when Windows locks the target
- [x] Improve handling when a drive comes back in a weird state
- [x] Add clearer retry guidance after cancellation or failure
- [x] Add clearer cleanup messaging after a partial write
- [x] Add better logging around failed physical drive access

## 7. Build stronger trust signals

- [ ] Sign release builds
- [ ] Use consistent app branding and icons
- [x] Keep installer wording clean and professional
- [x] Keep docs current for every release
- [x] Publish release notes for every version
- [x] Keep the security policy updated with supported versions

## 8. Add “it just works” polish

- [x] Make device refresh feel instant and obvious
- [x] Show better empty states
- [x] Improve progress wording during download, hashing, writing, and verification
- [x] Add clearer completion messages
- [x] Add better “what to do next” instructions after a drive is ready
- [x] Make the UI feel calm and obvious on smaller windows too

## 9. Stay safer than the average flasher

- [x] Never show internal drives in the normal target picker
- [x] Keep typed `CONFIRM` for destructive actions unless replaced with something equally strong
- [x] Preserve removable-media-only guardrails
- [x] Keep admin-only real write behavior
- [x] Expand tests around suspicious or blocked devices
- [x] Review preload and IPC boundaries when adding new features

## 10. Add the technical extras power users care about

- [x] Better checksum UX
- [x] Better verification result summaries
- [ ] More detailed mismatch reporting
- [x] Better support bundle contents
- [x] Stronger preset metadata and update process
- [x] Clearer classification output for image handling routes

## 11. Win on packaging and setup

- [ ] Keep the Windows installer easy and reliable
- [ ] Test clean install on a fresh Windows machine
- [ ] Test uninstall flow
- [ ] Test reinstall/upgrade flow
- [ ] Confirm shortcuts and Start Menu entries work correctly
- [ ] Consider auto-update later

## 12. Public proof matters

- [ ] Keep a visible changelog
- [ ] Publish known limitations honestly
- [ ] Share supported image examples
- [ ] Share tested USB drive examples
- [ ] Keep screenshots current
- [ ] Keep the README user-focused

## Release-readiness minimum bar

FlashTitan is probably not ready to claim broad release readiness until these are true:

- [ ] the default flow is clearly simpler for normal Windows users
- [ ] real-device testing is broad and documented
- [ ] Windows ISO creation is highly reliable
- [ ] Linux ISO support works well across common distros
- [ ] failure recovery is strong
- [ ] release packaging feels polished and trustworthy
- [ ] docs, installer, and safety messaging feel complete
