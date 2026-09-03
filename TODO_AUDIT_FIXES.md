# Sanctuary Book Reader — Audit Fix Tracker

> **Last audited**: 2026-09-03
> **Status**: All items resolved across prior commits. This document is retained as historical record.

---

## ✅ CRITICAL - Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 1 | XSS in ReaderSearchPanel (`dangerouslySetInnerHTML`) | Safe ReactNode splitting with regex-escaped query in `SafeHighlight` component |
| 2 | Goals API Date Calculation Bug | Correct `localDateKey` boundaries, `startOfWeek` using `(getDay()+6)%7` for Monday, single D1 aggregate query |
| 3 | ReaderSession Memory Leak | `destroy()` disconnects ResizeObserver, clears timeout, removes rendition listeners, destroys book |
| 4 | Auth Config Confusion | `.env.example` with clear documentation, runtime guest-mode assertion |

## ✅ HIGH - Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 5 | Streak Calculation Logic | Epoch-day based sorted consecutive diff check; current streak walks backward from today |
| 6 | Blob URL Memory Leak | Tracked map (`coverObjectUrlByBookId`) with revocation on replacement, reconciliation on sync, cleanup on book removal |
| 7 | Centralize Date Formatting | `toLocalDateKey` shared utility in `stats.ts`, `localDateKey` in `_shared.ts` — both use local date parts |
| 8 | Error Boundaries for EPUB | `ErrorBoundary` component in `components/ui/ErrorBoundary.tsx`, wired into app root in `index.tsx` |

## ✅ MEDIUM - Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 9 | Schema Migration Safety | Safe `CREATE TABLE IF NOT EXISTS` with `ALTER TABLE` fallbacks in `schemaBootstrap.ts` |
| 10 | Input Validation for Book ID | UUID format validation in `content/[id].ts` route |
| 11 | Sync Queue Error Handling | `isProcessing` reset in both success and error paths, exponential backoff |

## ✅ LOW - Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 12 | Accessibility Labels | `aria-label` on all icon-only buttons, `DropdownMenu` with proper `triggerId`, keyboard navigation, focus trap |
| 13 | Console.log Cleanup | Zero `console.log` in production code |
| 14 | Formatting | ESLint + Prettier passing, 0 errors |
| 15 | Type Safety | Zero `any` types, TypeScript strict mode passing |

## ✅ Design System - Completed

- Design tokens (CSS custom properties + Tailwind utilities)
- Satoshi font bundled locally (woff2, 300/400/500/700 weights)
- Motion tokens (`--motion-instant`, `--motion-fast`)
- Spacing tokens (`--space-1` through `--space-8`)
- Typography scale (`--text-xs` through `--text-4xl`)
- Forced-colors / high-contrast support
- Keep-alive pattern for Library/Stats/Settings views
