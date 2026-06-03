# FlashTitan Known Limitations

These limitations should stay visible to users and testers.

- FlashTitan is Windows-first in this build.
- Real write operations require Administrator rights.
- A successful write and verification result is strong evidence, but final boot success still depends on the target hardware and firmware settings.
- Public release confidence still depends on repeated tests across real USB drives, SD cards, host PCs, and target machines.
- Some unusual ISOs may still need additional hardware validation even when FlashTitan accepts them through the generic bootable fallback path.
- Release signing, broad install-upgrade validation, and wider public distribution polish are still follow-up work.
