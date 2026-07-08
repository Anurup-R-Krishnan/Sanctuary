# Sanctuary Forensic Review

## Review Scope
Comprehensive review of the three primary recovery artifacts (`SANCTUARY_PRODUCT_CONTRACT.md`, `SANCTUARY_RECOVERY.md`, `SANCTUARY_UI_AUDIT.md`) and their corresponding implementation within the repository. The review validates statuses, architectural invariants, fixed defects, and checks for bypasses or superficial UI modifications.

## Artifact Summary
- **SANCTUARY_PRODUCT_CONTRACT.md**: Initially missing from the file system; re-extracted from the trailing sections of the recovery ledger to ensure the rule matrix accurately reflects expected invariants.
- **SANCTUARY_RECOVERY.md**: Contains 15 SAN defects, marked entirely as FIXED. Claims of stability were audited.
- **SANCTUARY_UI_AUDIT.md**: Represents the UI state. Accurate regarding canonical primitives and extracted components, but still relies on runtime verification (Phases 15-17).

## Product Contract Statistics
- Total Rules: 5
- Enforced: 4
- Partial: 1
- Violated: 0
- Unverified: 0

## Recovery Ledger Statistics
- Total Defects: 15
- Verified Fixed: 14
- Incompletely Fixed: 1
- Regressed: 0
- Unverified Fixed: 0
- Open: 1 (Reopened)
- Blocked: 0

## UI Audit Statistics
- Migrations Verified: 14 phases complete
- Migrations Incomplete: Phases 15-17 (pending browser-based visual and accessibility testing)
- Legacy Implementations Found: None (remaining raw `<button>` usage is strictly justified via primitive internals or specialized aria-labeled functionality like the progress scrubber).

## Artifact Contradictions
- **INTERNAL-RECOVERY**: `SAN-013` claims to have fixed Guest Mode library loading from IndexedDB on page refresh by removing the early return. However, `LibraryService.ts` line 198 still executes an early return that wipes the active library to `[]` if `isPersistent` is false.
- **CONTRACT-IMPLEMENTATION**: `INV-LIB-001` claims EPUB binaries are globally unique per user via SHA-256 hashing. However, `content_hash` has no `UNIQUE` constraint in the D1 schema (`functions/utils/schemaBootstrap.ts`). The `ON CONFLICT` clause in `library.ts` only protects against identical `id` UUIDs, allowing multi-device uploads of the same EPUB to generate duplicates.

## Unsupported Claims
- "All explicit medium-to-high priority architectural risks, state duplications, and data-loss vulnerabilities identified during the recovery audit have been successfully resolved..." — `SAN-013` is not resolved, meaning Guest Mode users lose their library state on every page refresh. 

## Enforced Rule Verification

### INV-LIB-001
- **Document status**: ENFORCED
- **Repository finding**: `LibraryService.addBook` properly blocks local duplicate imports by checking `contentHash`. However, the backend (`functions/api/library.ts`) does not enforce a uniqueness constraint on `content_hash`, only on the primary key `id`.
- **Enforcement coverage**: Local UI path only. Remote sync/multi-device uploads are vulnerable.
- **Runtime evidence**: N/A (Static analysis of SQL schema).
- **Actual classification**: PARTIAL
- **Required action**: Add a `UNIQUE(user_id, content_hash)` constraint to the D1 schema, or reconcile duplicates on the backend during the `PATCH` or `INSERT` operations.

### INV-LIB-002
- **Document status**: ENFORCED
- **Repository finding**: `LibraryService.deleteBook` uses a `pendingDeletions` Set to debounce clicks and idempotently queue the `DELETE_LIBRARY` mutation. Historical stats are preserved because there is no `ON DELETE CASCADE` constraint forcing session drops.
- **Enforcement coverage**: Global.
- **Runtime evidence**: Code correctly executes `DELETE FROM books` in D1 and gracefully garbage collects locally.
- **Actual classification**: VERIFIED_FIXED
- **Required action**: None.

### INV-SYNC-001
- **Document status**: ENFORCED
- **Repository finding**: `LibraryService.loadBooks` detects `syncStatus === 'pending'` and orchestrates the transition to the cloud using `bookService.addBook` with the local epub binary.
- **Enforcement coverage**: Global.
- **Runtime evidence**: Static trace confirmed.
- **Actual classification**: VERIFIED_FIXED
- **Required action**: None.

### INV-RDR-001
- **Document status**: ENFORCED
- **Repository finding**: Teardown in `useReaderEngine.ts` explicitly detaches `relocated` listeners, destroys the Rendition, and clears the container HTML.
- **Enforcement coverage**: Global.
- **Runtime evidence**: Static trace confirmed.
- **Actual classification**: VERIFIED_FIXED
- **Required action**: None.

### INV-STAT-001
- **Document status**: ENFORCED
- **Repository finding**: `StatsService.ts` sanitizes duration and clamps `pagesRead`.
- **Enforcement coverage**: Global.
- **Runtime evidence**: Static trace confirmed.
- **Actual classification**: VERIFIED_FIXED
- **Required action**: None.

## Fixed Defect Reverification

### SAN-013
- **Document status**: FIXED
- **Repair still present**: No. The proposed repair (loading local books from IndexedDB inside `loadBooks` when `isPersistent` is false) is missing.
- **Root cause removed**: No. `LibraryService.loadBooks` wipes the array to `[]` when `isPersistent` is false.
- **Alternate paths checked**: Yes.
- **Runtime evidence**: Code inspect confirms `if (!isPersistent) { ... setBooks([]) ... return; }`.
- **Actual classification**: INCOMPLETELY_FIXED
- **Required action**: Rewrite `loadBooks` to actually load IndexedDB books when offline/guest instead of clearing the state.

## Architectural Bypasses
- None found outside of the `SAN-013` regression. The network logic correctly routes through `SyncQueue` and `SanctuaryApiClient`, and local persistence heavily utilizes IndexedDB.

## High-Risk Cluster Findings
1. **Book Identity & Duplicate Enforcement**: As noted in `INV-LIB-001`, the lack of a backend unique constraint on `content_hash` means the duplicate protection relies entirely on the client checking its local state before uploading. If two clients upload the same file simultaneously, or if a guest book transitions while a remote copy already exists, a duplicate may occur.
2. **Import Transaction**: Works as intended locally, but duplicate catching throws a UI error that is completely correct (`AddBookButton.tsx` handles it gracefully).
3. **Guest-to-Auth Migration**: Working cleanly via `loadBooks` transition loop, but relies heavily on the `id` matching. If a guest book and remote book are the same content but different IDs, they will duplicate (see point 1).

## Runtime Verification Gaps
- Browser UI Phase 15-17 testing is pending due to rate limits preventing the browser subagent from performing the interaction and visual audit.

## Reopened Defects
- **SAN-013**: Guest Mode library is not loaded from IndexedDB on page refresh.

## New Defects
- None.

## Documentation Corrections
- Extracted missing `SANCTUARY_PRODUCT_CONTRACT.md` from the trailing section of the recovery ledger.
- Corrected `INV-LIB-001` status to PARTIAL.

## Actual Production Readiness
The application is **NOT** ready for production. 
1. Guest Mode users will lose their library state on every page refresh (`SAN-013`).
2. Cloud synchronization is vulnerable to exact-duplicate book entries across multiple devices due to missing D1 constraints.
3. Final browser visual verification is pending.
