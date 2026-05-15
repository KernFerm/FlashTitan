# Contributing to FlashTitan

Thanks for helping improve FlashTitan.

## Main project values

- Safety comes first
- Clear wording is better than clever wording
- The normal user flow should stay simple
- Technical users should still have enough logs and detail to troubleshoot problems

## Local setup

```bash
npm install
npm start
```

## Tests

Run tests before sending changes:

```bash
npm test
```

If you change packaging or installer behavior, also run:

```bash
npm run pack
```

If you change the installer, release packaging, or app resources, also run:

```bash
npm run build
```

## Contribution guidelines

- Make focused changes
- Do not weaken removable-drive protections without a very strong reason
- Preserve the typed `CONFIRM` safety step unless it is replaced with something equally strong
- Keep user-facing language kind and easy to understand
- Add or update tests when behavior changes
- Update the docs when workflows or release behavior change

## Pull request checklist

- App still launches
- Tests pass
- Safety behavior still makes sense
- User-facing text is clear
- Docs are updated if needed
- Packaging still works if packaging-related files changed

## Good areas for contribution

- UI polish
- safer device handling
- broader image compatibility
- better verification reporting
- clearer recovery messages
- installer polish
- documentation
