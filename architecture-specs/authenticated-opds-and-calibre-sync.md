# Architecture Specification: Authenticated OPDS & Private Calibre Server Integration

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat d7e5ea7..HEAD -- apps/web/src/services/opdsService.ts apps/web/src/components/library/CatalogBrowser.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: OPDS 1.2 & 2.0 Catalog Feed Discovery
- **Category**: Library Management / Cloud Connectivity
- **Documented at**: commit `d7e5ea7`, 2026-09-13
- **Status**: READY

## Why this matters

While Sanctuary currently connects to public, unauthenticated OPDS catalogs (Standard Ebooks and Project Gutenberg), millions of readers self-host personal book servers using Calibre Content Server, Kavita, or Komga. These home libraries are password-protected via HTTP Basic or Bearer token authentication. Adding credential-aware OPDS requests allows readers to seamlessly browse, search, and download books from their self-hosted home servers directly into Sanctuary without manual file transfers.

## Current state

The relevant files:
- `apps/web/src/types/opds.ts`: Defines `CatalogSource`, `OpdsFeed`, `OpdsEntry`, and `OpdsLink`.
- `apps/web/src/services/opdsService.ts`: Parses XML/JSON feeds and downloads book files.
- `apps/web/src/components/library/CatalogBrowser.tsx`: Catalog selector and book grid modal.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/types/opds.ts`: Extend `CatalogSource` with optional `username`, `password`, and `bearerToken` credentials.
- `apps/web/src/services/opdsService.ts`: Inject `Authorization` headers (`Basic` or `Bearer`) into `fetchOpdsFeed` and `downloadCatalogBook`.
- `apps/web/src/components/library/CatalogBrowser.tsx`: Add catalog creation form with optional credential fields and local storage persistence.
- `apps/web/src/services/opdsService.test.ts`: Add unit test coverage for authenticated feed fetching, 401 handling, and credential encoding.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Storing unencrypted credentials in remote public databases.

## Execution Sequence

### Work Unit 1: Extend Catalog Schema and Header Generation
- Update `CatalogSource` in `apps/web/src/types/opds.ts`:
  - `bearerToken?: string;`
  - `password?: string;`
  - `username?: string;`
- In `opdsService.ts`, implement `buildCatalogAuthHeader(catalog: CatalogSource): string | undefined`.
- Pass headers to feed requests and download stream requests.

### Work Unit 2: Update Catalog Management UI
- In `CatalogBrowser.tsx`, add an "Add Custom Catalog" modal/drawer:
  - Catalog Name input.
  - OPDS Feed URL input.
  - Optional Authentication dropdown (None, Basic Auth, Bearer Token).
  - Test connection button verifying 200 OK feed response.
- Persist custom catalogs in local storage or IndexedDB.

### Work Unit 3: Verification & Quality Assurance
- Add unit tests in `opdsService.test.ts` verifying Base64 Basic auth header generation and Bearer token transmission.
- Run `bun run check && bun test && bun run lint && bun run build`.
- Confirm web bundle remains under 500 kB budget.

## STOP conditions

- If Calibre feed requires proprietary binary extensions not compliant with OPDS 1.2 or 2.0.
- If bundle size increases beyond 500 kB.
