# Sanctuary V2 Implementation (Initial Delivery)

This branch introduces a parallel V2 architecture without replacing the existing V1 app.

## What was implemented

- Monorepo workspaces (`apps/*`, `packages/*`) in root `package.json`.
- New Expo React Native app scaffold:
  - `apps/mobile`
  - Desktop-first app shell layout via shared screens and bottom tabs.
  - Library, Reader, Settings, Stats V2 screens.
  - `WebView` reader host scaffold and bridge bootstrap.
- New shared packages:
  - `packages/core`: v2 API/types/client.
  - `packages/ui`: design tokens.
  - `packages/reader-webview`: reader bridge command/event contracts.
- New desktop wrapper scaffold:
  - `apps/desktop/src-tauri` with Tauri 2 configuration and Rust entrypoint.
- New backend v2 contract endpoints:
  - `functions/api/v2/me.ts`
  - `functions/api/v2/settings.ts`
  - `functions/api/v2/sessions.ts`
  - `functions/api/v2/library.ts`
- Added missing utility/type files needed by functions routes:
  - `functions/types.d.ts`
  - `functions/utils/auth.ts`
  - `functions/utils/dbSchema.ts`
  - `functions/utils/schemaBootstrap.ts`

## Runbook

1. Install workspace dependencies:

```bash
npm install
```

2. Run V2 mobile/web app:

```bash
npm run v2:mobile
# or
npm run v2:mobile:web
```

3. Run Tauri desktop shell:

```bash
npm run v2:desktop:dev
```

4. Run Cloudflare functions in dev as before (v1 and v2 endpoints are both present):

```bash
npm run dev:backend:guest
```

## Notes

- Reader WebView currently includes a bridge scaffold, not full epub.js rendering yet.
- API v2 is core-contract oriented and keeps the existing book content storage model.
- Existing V1 codepaths are preserved.
