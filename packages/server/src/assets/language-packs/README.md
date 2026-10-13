# Bundled Simplified Chinese

Official translation snapshot from [Pasta-Devs/Marinara-Engine docs-i18n](https://github.com/Pasta-Devs/Marinara-Engine/tree/4a8b5ada8e47cd921a8b4bca70453196004c0fa4), commit `4a8b5ada8e47cd921a8b4bca70453196004c0fa4`.

- UI: `ui/zh-Hans.json` (partial translations; missing keys use English).
- Documentation: `docs/zh-hans/` (137 Markdown files and their manifest).

These assets are copied to server `dist/assets` by the existing build, including both Docker images. Simplified Chinese reads, installs, repairs and boot reconciliation do not need GitHub access. Other languages retain their download flow. Existing valid UI packs in the data directory override the bundled UI fallback.

Keep snapshot bytes unchanged: manifests verify SHA-256 and byte sizes. To update documentation, replace files and regenerate its manifest with `node scripts/docs-i18n/build-manifest.mjs packages/server/src/assets/language-packs/docs/zh-hans`. To update the UI pack, update its size and hash in `ui/manifest.json`. The assets are excluded from Prettier to preserve the upstream hashes; Git enforces LF checkouts.
