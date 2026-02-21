# Sanctuary V2 Implementation

The repository now uses a three-app layout under `apps/`:

- `apps/web`: primary web app (Vite)
- `apps/mobile`: Expo mobile app with web target
- `apps/desktop`: Tauri desktop wrapper loading `apps/web` output

## What was implemented

- Monorepo workspaces (`apps/*`, `packages/*`) in root `package.json`.
- Web app migration:
  - Legacy root web app (`src`) moved to `apps/web/src`
  - Root web entry files removed in favor of `apps/web/*`
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
  - Desktop dev/build now targets `apps/web/dist`.
- New backend v2 contract endpoints:
  - `functions/api/v2/me.ts`
  - `functions/api/v2/settings.ts`
  - `functions/api/v2/sessions.ts`
  - `functions/api/v2/library.ts`
  - `functions/api/v2/goals.ts`
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
npm run web:dev
# or guest mode
npm run web:guest
# or strict auth mode
npm run web:strict
```

3. Run mobile app:

```bash
npm run mobile:dev
# or
npm run mobile:web
```

4. Run Tauri desktop shell:

```bash
npm run desktop:dev
```

If desktop startup/build fails, ensure:

- Rust toolchain is installed (`rustup`, `cargo`, `rustc`)
- Linux dependencies are installed: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

5. Run Cloudflare functions in dev:

```bash
npm run dev:backend:guest
```

## Notes

- Compatibility aliases remain available:
  - `v2:web`, `v2:mobile`, `v2:mobile:web`, `v2:desktop:dev`
- `packages/*` remains the shared contract/UI/bridge layer.
- `functions/api/v2/*` remains the backend contract for V2 reader/app features.
