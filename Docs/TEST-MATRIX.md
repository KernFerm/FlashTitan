# FlashTitan Hardware Validation Matrix

FlashTitan only earns real trust after repeated testing on real hardware and removable media. Use this matrix with sacrificial USB drives and SD cards.

## Automated preflight coverage

These checks do not replace real-device validation, but they should stay green before hardware testing:

- `npm test`
- dummy-image smoke test for classification plus removable-target validation
- archive, device-safety, IPC-policy, support-bundle, and mismatch-reporting coverage

## Core image coverage

| Image type | Example | Expected route | Verify mode |
| --- | --- | --- | --- |
| Hybrid Linux ISO | Ubuntu Desktop | Raw write | Full |
| Hybrid Linux ISO | Linux Mint | Raw write | Full |
| Hybrid Linux ISO | Fedora Workstation | Raw write | Full |
| Generic bootable ISO | niche Linux or utility image | Raw write fallback | Full |
| Windows installer ISO | Windows 11 | Windows USB workflow | Full |
| Windows installer ISO | Windows 10 | Windows USB workflow | Full |
| IMG | Raspberry Pi OS `.img` | Raw write | Full |
| ZIP | zipped IMG or ISO | Extract then raw write | Full |
| XZ | compressed IMG | Extract then raw write | Full |
| GZ | compressed IMG | Extract then raw write | Full |

## Host PC coverage

| Host type | Coverage target |
| --- | --- |
| Windows 10 | download, flash, verify |
| Windows 11 | download, flash, verify |
| Admin launch | full write flow |
| Non-admin launch | warning, relaunch, blocked writes |

## Target firmware coverage

| Target PC | Coverage target |
| --- | --- |
| Legacy BIOS-only PC | Linux USB boot |
| UEFI PC with Secure Boot off | Linux and Windows boot |
| UEFI PC with Secure Boot on | expected supported distro behavior |
| Older laptop with legacy BIOS | Linux USB boot menu path |

## Media coverage

| Media type | Coverage target |
| --- | --- |
| USB 2.0 8 GB | small removable media |
| USB 3.x 16-64 GB | mainstream install media |
| SD card 16-64 GB | Raspberry Pi and generic raw write |
| Read-only or locked media | safety rejection |
| Unplug during write | cancellation and recovery guidance |

## Pass criteria

- FlashTitan identifies the route correctly before writing
- only intended removable media can be selected
- the operation log records the path taken
- the target boots on real hardware
- verification succeeds or failure is explained clearly
- support bundle contains useful troubleshooting details

## Failure notes to capture

- exact ISO or IMG filename and checksum
- USB or SD brand and capacity
- target PC model and firmware mode
- whether Secure Boot was enabled
- FlashTitan log path
- copied diagnostics summary
- support bundle path
