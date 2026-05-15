# FlashTitan Release Notes

## Version `0.0.25`

### User-facing changes

- Simpler main flow focused on choosing an image, choosing a USB drive, and making the drive bootable
- Friendlier status text and empty states
- Better archive handling for `.zip`, `.xz`, and `.gz`
- Wider preset catalog for Linux, ARM, and Windows downloads
- Improved recovery wording after lock errors, disconnects, cancellations, and verification failures
- Separate license and safety acknowledgment installer pages

### Technical changes

- Better removable-drive classification and safety filtering
- Shared device safety rules moved into `device-safety.js`
- Shared IPC rules introduced for privileged bridge traffic
- Better support bundle content and route classification details
- Expanded preset metadata in `preset-utils.js`
- Archive preview support added before extraction
- More tests added around device safety, IPC policy, archive handling, and flash error normalization

### Packaging notes

- Windows packaged app output is available through `npm run pack`
- Windows installer output is available through `npm run build`
- Current packaged Windows output includes the bridge fixes required for preset loading and USB detection

### License

- FlashTitan is open source under the Apache License 2.0

## Release contents

A normal Windows release should include:

- `FlashTitan-<version>-Installer.exe`
- packaged app output for Windows
- license agreement page
- safety acknowledgment page

## Known follow-up work

- code signing
- branded icons
- broader real hardware validation
- deeper verification mismatch reporting
