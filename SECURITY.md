# Security Policy

FlashTitan version covered by this policy: `0.0.25`

## Supported versions

| Version | Supported |
| --- | --- |
| `0.0.27` | Yes |
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
- sanitize paths, URLs, and checksums
- block unsafe renderer navigation and popup behavior

## Technical notes

- renderer uses `contextIsolation: true`
- renderer uses `nodeIntegration: false`
- renderer uses `sandbox: true`
- privileged actions are exposed through the preload bridge only
- write operations require Administrator privileges on Windows

## Out of scope

- bugs inside third-party OS images
- unsupported non-Windows flashing behavior
- user-selected destructive actions after explicit confirmation, unless FlashTitan ignored its own safety rules
