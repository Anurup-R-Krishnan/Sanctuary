# Plan 004: Zero-Tolerance Quality Gate & Multi-Format Robustness Tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 553e7f6..HEAD -- apps/web/src/components/pages/SettingsView.tsx apps/web/src/reader/formats/formatParsers.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `553e7f6`, 2026-09-12

## Why this matters

The codebase is currently in a pristine state with 0 errors across 182 files in trace-mcp, but has exactly 1 linter warning (`@typescript-eslint/no-explicit-any` in `SettingsView.tsx:41`) preventing a 100% clean zero-tolerance baseline. Furthermore, while the multi-format pipeline supports 8 formats, edge cases like malformed XML in FB2, documents with UTF-8 BOM markers, or missing HTML sections need explicit automated test verification to protect against production crashes when users import unverified public domain files.

## Current state

The relevant files:
- `apps/web/src/components/pages/SettingsView.tsx:41`:
  ```tsx
  const NavAnchor = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
      <a href={`#${id}`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-lg transition-colors">
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
      </a>
  );
  ```
  Causes ESLint warning: `warning Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`.
- `apps/web/src/reader/formats/formatParsers.test.ts`: Tests happy paths for TXT, Markdown, HTML, FB2, and EPUB, but lacks edge case test assertions for malformed streams and encoding anomalies.

Repo conventions to follow:
- Strict TypeScript: no `any` types; use `React.ComponentType<{ className?: string }>` for Lucide icon components.
- Tests use Bun test runner (`describe`, `it`, `expect`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0, 0 warnings  |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope** (the only files you should modify or create):
- `apps/web/src/components/pages/SettingsView.tsx`
- `apps/web/src/reader/formats/formatParsers.test.ts`

**Out of scope** (do NOT touch):
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Any other source files

## Git workflow

- Branch: `advisor/004-zero-tolerance-lint-and-e2e`
- Commit message style: Conventional Commits, e.g. `test(reader): multi-format parser edge cases and clean settings linter`

## Steps

### Step 1: Fix `icon: any` type in `SettingsView.tsx`
In `apps/web/src/components/pages/SettingsView.tsx`:
Change line 41 from:
```tsx
const NavAnchor = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
```
to:
```tsx
const NavAnchor = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ComponentType<{ className?: string }> }) => (
```

**Verify**: `bun run lint` → Output must show:
```
0 problems (0 errors, 0 warnings)
lint success
```

### Step 2: Add edge-case robustness tests in `formatParsers.test.ts`
In `apps/web/src/reader/formats/formatParsers.test.ts`:
Add a test suite `Multi-Format Pipeline Edge Cases & Resilience`:
1. **UTF-8 with BOM**: Test that plain text or markdown containing a `\uFEFF` Byte Order Mark is stripped cleanly without showing `ï»¿` artifacts.
2. **Malformed FB2 XML**: Test that an FB2 file with unclosed tags or syntax errors falls back gracefully without an unhandled runtime exception.
3. **Empty or Whitespace-Only Documents**: Test that empty text or markdown returns a single blank section with a default chapter title rather than crashing.
4. **HTML without standard `<html><body>` tags**: Test that an HTML snippet with raw `<p>` tags is properly wrapped and rendered by `HtmlParser`.

**Verify**: `bun test apps/web/src/reader/formats/formatParsers.test.ts` → all pass

## Test plan

- Run `bun run lint` and verify 0 errors and 0 warnings.
- Run `bun test` and verify all tests pass, including the new edge case test suite.
- Run `bun run check` and verify TypeScript compilation passes.

## Done criteria

- [ ] `bun run lint` produces **0 problems (0 errors, 0 warnings)**.
- [ ] `bun run check` exits 0.
- [ ] `bun test` exits 0 with all edge case tests passing.
- [ ] `plans/README.md` status row updated to DONE.

## STOP conditions

- If fixing the lint warning breaks React component typing or requires changing `lucide-react` import style, stop and report.

## Maintenance notes

- CI should enforce `--max-warnings=0` on `eslint` to maintain the zero-tolerance standard permanently.
