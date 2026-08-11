# Security Policy

![Covered Version](https://img.shields.io/badge/covered%20version-0.1.0-blue)
![Security Model](https://img.shields.io/badge/renderer-sandboxed-success)
![IPC Policy](https://img.shields.io/badge/IPC-allowlisted-important)

FlashTitan version covered by this policy: `0.1.0`

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.0` | Yes |
| older development builds | No guarantee |

## Reporting a security issue

Please report security issues privately first instead of posting a public exploit immediately.

Useful details:

- FlashTitan version
- Windows version
- what you were doing
- what you expected
- what happened instead
- screenshots, logs, or support bundle details if helpful

## Security goals

FlashTitan aims to:

- reduce accidental drive erasure
- keep privileged operations behind a narrow desktop bridge
- avoid exposing raw Node.js APIs to the renderer
- sanitize paths, URLs, checksums, and IPC payloads
- block unsafe renderer navigation and popup behavior

## Technical controls

- renderer uses `contextIsolation: true`
- renderer uses `nodeIntegration: false`
- renderer uses `sandbox: true`
- privileged actions are exposed through the preload bridge only
- IPC access is allowlisted through the bridge and main-process policy layer
- write operations require Administrator privileges on Windows
- internal and likely system drives are blocked in the normal picker flow

## Diagnostics and support bundles

Support bundles and copied diagnostics may contain technical details such as:

- image metadata
- removable-device metadata
- runtime information
- logs and verification summaries

Review that data before sharing it publicly.

## Out of scope

- bugs inside third-party OS images
- unsupported non-Windows flashing behavior
- user-selected destructive actions after explicit warning, unless FlashTitan ignored its own safety rules
