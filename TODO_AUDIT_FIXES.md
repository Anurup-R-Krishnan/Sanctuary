# Sanctuary Book Reader - Audit Fixes TODO

## Overview
This list tracks fixes for issues identified in the codebase audit. Items are ordered by priority and dependencies.

---

## 🔴 CRITICAL - Immediate Fixes

### 1. Fix XSS Vulnerability in ReaderSearchPanel
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/components/reader/ReaderSearchPanel.tsx`
- [ ] **Action**: Replace `dangerouslySetInnerHTML` with safe CSS-based highlighting
- [ ] **Verify**: No raw HTML injection in search results
- [ ] **Priority**: HIGH

### 2. Fix Goals API Date Calculation Bug
- [ ] **Status**: pending
- [ ] **File**: `functions/api/goals.ts` lines 26-34
- [ ] **Action**: Use correct date boundaries for each time window (dayStart, weekStart, monthStart)
- [ ] **Verify**: Day goal calculates from today, week from week start, month from month start
- [ ] **Priority**: HIGH

### 3. Fix Memory Leak in ReaderSession
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/reader/engine/ReaderSession.ts`
- [ ] **Action**: Add cleanup for ResizeObserver and event listeners in destroy method
- [ ] **Verify**: No event listeners or observers left after session destroy
- [ ] **Priority**: HIGH

### 4. Fix Authentication Configuration Confusion
- [ ] **Status**: pending
- [ ] **File**: `.env`, `.env.example`, `functions/utils/auth.ts`
- [ ] **Action**: Standardize env vars, add runtime assertion for guest mode
- [ ] **Verify**: Clear documentation, production safety checks
- [ ] **Priority**: HIGH

---

## 🟠 HIGH - Short-term Fixes

### 5. Fix Streak Calculation Logic Error
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/utils/stats.ts` lines 70-85
- [ ] **Action**: Rewrite streak calculation with correct algorithm
- [ ] **Verify**: Test with various session date patterns
- [ ] **Priority**: HIGH

### 6. Fix Blob URL Memory Leak
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/services/LibraryService.ts`
- [ ] **Action**: Ensure all book removals and unmounts cleanup object URLs
- [ ] **Verify**: Memory profile shows no accumulation
- [ ] **Priority**: MEDIUM

### 7. Centralize Date Formatting
- [ ] **Status**: pending
- [ ] **Files**: `apps/web/src/utils/stats.ts`, `functions/api/_shared.ts`
- [ ] **Action**: Create single source of truth for date key formatting
- [ ] **Verify**: Consistent date behavior across goals, stats, sync
- [ ] **Priority**: MEDIUM

### 8. Add Error Boundaries for EPUB Operations
- [ ] **Status**: pending
- [ ] **Files**: `apps/web/src/components/pages/ReaderView.tsx`, `ReaderSession.ts`
- [ ] **Action**: Wrap EPUB loading in try/catch, show graceful error
- [ ] **Verify**: Corrupted EPUB shows error UI, doesn't crash app
- [ ] **Priority**: MEDIUM

---

## 🟡 MEDIUM - Next Sprint

### 9. Improve Schema Migration Safety
- [ ] **Status**: pending
- [ ] **File**: `functions/utils/schemaBootstrap.ts`
- [ ] **Action**: Replace build/migration approach with safe ALTER TABLE only
- [ ] **Verify**: Migrations work without data loss
- [ ] **Priority**: MEDIUM

### 10. Add Input Validation for Book ID
- [ ] **Status**: pending
- [ ] **File**: `functions/api/content/[id].ts`
- [ ] **Action**: Validate book ID format before using in operations
- [ ] **Verify**: Invalid IDs return 400, not 500
- [ ] **Priority**: LOW

### 11. Fix Sync Queue Error Handling
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/services/SyncQueue.ts`
- [ ] **Action**: Ensure `isProcessing` reset in all code paths, improve backoff
- [ ] **Verify**: Queue recovers from transient failures
- [ ] **Priority**: LOW

---

## 🟢 LOW - Polish Items

### 12. Add Accessibility Labels
- [ ] **Status**: pending
- [ ] **File**: `apps/web/src/components/reader/ReaderSelectionMenu.tsx`
- [ ] **Action**: Add `aria-label` to icon-only buttons
- [ ] **Verify**: Screen readers announce button purposes
- [ ] **Priority**: LOW

### 13. Remove Debug Console.log Statements
- [ ] **Status**: pending
- [ ] **Files**: `functions/utils/auth.ts`, `schemaBootstrap.ts`, others
- [ ] **Action**: Remove or gate with debug flag
- [ ] **Verify**: No console.log in production builds
- [ ] **Priority**: LOW

### 14. Fix Code Formatting Inconsistencies
- [ ] **Status**: pending
- [ ] **Action**: Run ESLint fix, update Prettier config
- [ ] **Verify**: `bun run lint` shows no formatting issues
- [ ] **Priority**: LOW

### 15. Improve Type Safety
- [ ] **Status**: pending
- [ ] **Action**: Replace remaining `any` types with proper types
- [ ] **Verify**: TypeScript strict mode passes
- [ ] **Priority**: LOW

---

## 📋 Verification Checklist

After all fixes:
- [ ] Run `bun run lint` - no errors
- [ ] Run `bun run check` - no type errors
- [ ] Manual test EPUB reader with various files
- [ ] Test login/logout flows
- [ ] Test book import/export flows
- [ ] Verify goals display correct time windows
- [ ] Verify streak calculations are correct
- [ ] Memory profile test for leaks
- [ ] Run security scan for XSS patterns

---

## Progress Tracking

| Issue | Status | Est. Hours |
|-------|--------|------------|
| XSS Vulnerability | ✅ pending | 1-2 |
| Goals API Bug | ✅ pending | 0.5 |
| ReaderSession Memory Leak | ✅ pending | 0.5 |
| Auth Config | ✅ pending | 0.5 |
| Streak Calculation | ✅ pending | 0.5 |
| Blob URL Leak | ✅ pending | 0.5 |
| Date Formatting | ✅ pending | 0.5 |
| Error Boundaries | ✅ pending | 0.5 |
| Schema Migration | ✅ pending | 1 |
| Input Validation | ✅ pending | 0.5 |
| Sync Queue Fix | ✅ pending | 0.5 |
| Accessibility | ✅ pending | 0.5 |
| Console.log Cleanup | ✅ pending | 0.5 |
| Formatting | ✅ pending | 0.5 |
| Type Safety | ✅ pending | 1 |

**Total Estimated Effort**: ~8-10 hours