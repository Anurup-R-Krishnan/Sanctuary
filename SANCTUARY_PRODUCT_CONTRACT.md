# Sanctuary Product Contract

## Product Invariants

### Library & Book Identity

**INV-LIB-001**
**Status:** PARTIAL
**Invariant:** An exact EPUB binary may correspond to at most one active library item per user.
**Enforcement points:** Local import pipeline `LibraryService.addBook` via SHA-256 binary hashing.
**Verification:** Import the exact same binary under different filenames.

**INV-LIB-002**
**Status:** ENFORCED
**Invariant:** Book deletion is strictly idempotent and must not corrupt historical tracking data.
**Enforcement points:** `LibraryService.deleteBook` UI state locks and IndexedDB mutations.
**Verification:** Rapid double-clicking of the delete button must trigger only a single DB deletion. Reading statistics and sessions must explicitly survive the book binary deletion.

### Synchronization & Guest Mode

**INV-SYNC-001**
**Status:** ENFORCED
**Invariant:** Books and sessions generated in Guest Mode must seamlessly transition to the Cloud without data loss.
**Enforcement points:** `LibraryService.loadBooks` detects `syncStatus === 'pending'` and orchestrates asynchronous background binary uploads to R2 and D1.
**Verification:** Import book offline. Sign in. Verify the book remains in the local library and is pushed to the server via the `bookService.addBook` payload.

### Reader Engine Lifecycle

**INV-RDR-001**
**Status:** ENFORCED
**Invariant:** Reader teardown must not leak `epubjs` Rendition listeners or iframe memory.
**Enforcement points:** `useReaderEngine.ts` explicitly detaches `on('relocated')` listeners, destroys Book/Rendition objects, and clears `container.innerHTML` sequentially.
**Verification:** Toggle Reader themes and settings rapidly. Verify zero orphaned iframe elements remain attached to the DOM.

### Reading Session Integrity

**INV-STAT-001**
**Status:** ENFORCED
**Invariant:** Reading sessions must not record negative durations, overlapping timestamps, or durations exceeding 24 hours.
**Enforcement points:** `StatsService.ts` sanitizes duration deltas and clamps `pagesRead` during `.endSession`.
**Verification:** Sleep the host OS for 30 hours, wake, and close the Reader. Verify the session caps at 24 hours.
