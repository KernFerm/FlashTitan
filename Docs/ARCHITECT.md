# FlashTitan Architecture

## High-level design

FlashTitan is a Windows-first Electron app with a split between:

- renderer UI
- preload desktop bridge
- main process
- media classification and flashing logic
- Windows PowerShell helpers

## Main components

### UI layer

- `index.html`
- `style.css`
- `renderer.js`

This layer handles the visible Etcher-style workflow, status, progress, diagnostics actions, logs, settings, and user guidance.

### Desktop bridge

- `preload.js`

This layer exposes a narrow safe API from Electron into the renderer. The renderer does not get raw Node.js access.

### Main process

- `main.js`

This layer owns:

- dialogs
- IPC handlers
- device listing
- image validation
- downloads
- settings
- logs
- support bundle creation
- packaging and runtime lifecycle behavior

### Flashing and media logic

- `flash-engine.js`
- `windows-media.js`
- `archive-utils.js`
- `download-utils.js`
- `preset-utils.js`
- `support-bundle.js`

This layer decides how an image should be handled, prepares the write flow, and summarizes results for verification and diagnostics.

### Shared guardrails

- `device-safety.js`
- `ipc-policy.js`

These modules centralize removable-drive rules and privileged bridge policy.

### Windows scripts

- `windows-scripts/`

These PowerShell helpers do Windows-specific inspection and media operations.

## Main flow

1. User selects, downloads, or presets an image
2. Main process validates the file
3. Archives are previewed and extracted if needed
4. Image classification decides the write route
5. User refreshes and selects a removable target
6. FlashTitan validates that the chosen target is safe removable media
7. FlashTitan starts the privileged media operation
8. Progress, verification, and completion details are streamed back to the UI

If exactly one safe removable drive is present, the renderer may auto-select it after refresh to keep the normal flow moving.

## Security model

- sandboxed renderer
- context isolation enabled
- no raw Node.js access in the renderer
- explicit preload bridge
- allowlisted IPC channels
- Administrator-required write path on Windows

## Design priorities

- safety before convenience
- simple UI for non-technical users
- enough detail for technical users
- Windows-first reliability
- diagnostics that help explain failures instead of hiding them
