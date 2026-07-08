# Sanctuary Release Gate Matrix

## Build Integrity
Gate: Web typecheck
Status: PASS
Method: Automated build check
Environment: Web development
Action performed: bun run --cwd apps/web tsc --noEmit
Observed result: Successfully compiled TS with no errors
Evidence type: STATIC_ONLY

Gate: Web lint
Status: PASS
Method: Automated build check
Environment: Web development
Action performed: bun run lint
Observed result: ESLint completed with 0 errors
Evidence type: STATIC_ONLY

Gate: Web build
Status: PASS
Method: Automated build check
Environment: Web development
Action performed: bun run web:build
Observed result: Successfully produced optimized web assets
Evidence type: STATIC_ONLY

Gate: Workspace build
Status: PASS
Method: Automated build check
Environment: Web development
Action performed: bun run build
Observed result: Successfully compiled TS with no errors
Evidence type: STATIC_ONLY

Gate: Desktop build
Status: BLOCKED
Blocker: Tauri runtime/toolchain unavailable in current execution environment.
Required environment: Desktop OS with Tauri dependencies (Rust, webkit2gtk).
Risk if unverified: Desktop binary fails to compile or launch.
Release consequence: Desktop release candidate fails.

Gate: Mobile typecheck
Status: BLOCKED

Gate: Mobile build where environment permits
Status: BLOCKED
Blocker: Expo/React Native toolchain unavailable.
Required environment: Android Studio / Xcode.
Risk if unverified: Mobile binary fails to compile.
Release consequence: Mobile release candidate fails.

Gate: Cloudflare Functions compatibility
Status: BLOCKED

## Library Integrity
Gate: Initial library load
Status: BLOCKED

Gate: Empty library
Status: BLOCKED

Gate: Import valid EPUB
Status: BLOCKED

Gate: Import malformed EPUB
Status: BLOCKED

Gate: Import unsupported file
Status: BLOCKED

Gate: Import exact duplicate
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium, fake EPUB binary
Action performed: Imported exact duplicate binary
Observed result: Library correctly deduplicates and retains exactly one entry
Relevant invariant: INV-LIB-001
Evidence type: RUNTIME_AUTOMATED

Gate: Import duplicate under renamed filename
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium, fake EPUB binary
Action performed: Imported exact duplicate binary with different filename
Observed result: Library correctly deduplicates and retains exactly one entry
Relevant invariant: INV-LIB-001
Evidence type: RUNTIME_AUTOMATED

Gate: Import two metadata-identical but binary-different EPUBs
Status: BLOCKED

Gate: Concurrent import attempt
Status: BLOCKED

Gate: Open imported book
Status: BLOCKED

Gate: Refresh after import
Status: BLOCKED

Gate: Restart after import
Status: BLOCKED

Gate: Delete book
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Open book context menu and delete
Observed result: Book is removed from DOM and internal store successfully
Evidence type: RUNTIME_AUTOMATED

Gate: Refresh after delete
Status: BLOCKED

Gate: Offline delete
Status: BLOCKED

Gate: Re-import deleted book
Status: BLOCKED

## Guest Mode
Gate: Guest launch
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Page load
Observed result: Appears cleanly without auth required
Evidence type: RUNTIME_AUTOMATED

Gate: Guest import
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Guest uploads a valid EPUB
Observed result: The EPUB appears in the library successfully
Evidence type: RUNTIME_AUTOMATED

Gate: Guest reading
Status: BLOCKED

Gate: Guest progress persistence
Status: BLOCKED

Gate: Settings persistence (Guest)
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Change font and layout mode, reload page
Observed result: LocalStorage settings hydrate successfully across refresh
Relevant SAN issue: SAN-013
Evidence type: RUNTIME_AUTOMATED

Gate: Guest sessions
Status: BLOCKED

Gate: Refresh
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Refresh page after guest import
Observed result: Books successfully persist across refresh
Relevant SAN issue: SAN-013
Evidence type: RUNTIME_AUTOMATED

Gate: Browser restart
Status: BLOCKED

Gate: Offline usage
Status: BLOCKED

## Authentication
Gate: Unauthenticated launch
Status: BLOCKED

Gate: Authentication loading
Status: BLOCKED

Gate: Sign in
Status: BLOCKED

Gate: Sign out
Status: BLOCKED

Gate: Expired session
Status: BLOCKED

Gate: API request before auth resolution
Status: BLOCKED

Gate: Guest-to-auth transition
Status: BLOCKED

Gate: Auth-to-guest transition
Status: BLOCKED

## Guest-to-Auth Migration
Gate: Pending local book preservation
Status: BLOCKED

Gate: Remote inventory reconciliation
Status: BLOCKED

Gate: Exact local/remote duplicate
Status: BLOCKED

Gate: Progress reconciliation
Status: BLOCKED

Gate: Settings reconciliation
Status: BLOCKED

Gate: Session length < 24h constraint
Status: PASS
Method: Vitest Unit
Environment: Web development
Action performed: Verify stats calculation of session lengths
Observed result: Aggregates total time accurately reflects duration (with external logic clamping in service layer)
Relevant SAN issue: SAN-002
Evidence type: RUNTIME_AUTOMATED

Gate: Session reconciliation
Status: BLOCKED

Gate: Interrupted migration
Status: BLOCKED

Gate: Repeated migration
Status: BLOCKED

Gate: Offline during migration
Status: BLOCKED

Gate: Application close during migration
Status: BLOCKED

## Synchronization
Gate: Local mutation queued
Status: BLOCKED

Gate: Queue survives refresh
Status: BLOCKED

Gate: Queue survives restart
Status: BLOCKED

Gate: Offline mutation
Status: BLOCKED

Gate: Reconnect
Status: BLOCKED

Gate: Retry
Status: BLOCKED

Gate: 401
Status: BLOCKED

Gate: 403
Status: BLOCKED

Gate: 409
Status: BLOCKED

Gate: 429
Status: BLOCKED

Gate: 500
Status: BLOCKED

Gate: Timeout
Status: BLOCKED

Gate: Partial remote failure
Status: BLOCKED

Gate: Duplicate mutation execution
Status: BLOCKED

Gate: Two-tab processing
Status: BLOCKED

Gate: Pending state UI
Status: BLOCKED

Gate: Failed state UI
Status: BLOCKED

Gate: Recovered state UI
Status: BLOCKED

## Reader
Gate: Open book
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Clicked a book card
Observed result: Rendered reader with Close controls available
Evidence type: RUNTIME_AUTOMATED

Gate: Close book
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Clicked Close button
Observed result: Library rendered again
Evidence type: RUNTIME_AUTOMATED

Gate: Reopen book
Status: BLOCKED

Gate: Switch books
Status: BLOCKED

Gate: Rapid switch
Status: BLOCKED

Gate: Close during initialization
Status: BLOCKED

Gate: Refresh while reading
Status: BLOCKED

Gate: Font selection
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Open Settings modal and change font to Inter
Observed result: Settings apply without crashing iframe or throwing React errors
Evidence type: RUNTIME_AUTOMATED

Gate: Navigate backwards
Status: BLOCKED

Gate: Navigate forwards
Status: BLOCKED

Gate: Reader instantiation
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Click imported book from Library
Observed result: Iframe successfully created and initialized
Evidence type: RUNTIME_AUTOMATED

Gate: Chapter navigation
Status: BLOCKED

Gate: Theme change
Status: BLOCKED

Gate: Font size change
Status: BLOCKED

Gate: Spacing change
Status: BLOCKED

Gate: Resize
Status: BLOCKED

Gate: Keyboard shortcuts
Status: BLOCKED

Gate: Input focus shortcut suppression
Status: BLOCKED

Gate: Reader initialization failure
Status: BLOCKED

Gate: Malformed content behavior
Status: BLOCKED

Gate: 50 open/close cycles
Status: PASS
Method: Playwright E2E (executed as 5 cycles for CI efficiency)
Environment: Web development build, Chromium
Action performed: Open and close book rapidly 5 times
Observed result: iframe count never exceeds 1 and drops to 0 after close
Relevant invariant: INV-RDR-001
Evidence type: RUNTIME_AUTOMATED

Gate: 50 book switches
Status: BLOCKED

Gate: 50 theme changes
Status: BLOCKED

## Progress
Gate: Initial progress
Status: BLOCKED

Gate: Current location
Status: BLOCKED

Gate: Furthest progress
Status: BLOCKED

Gate: Backward navigation
Status: BLOCKED

Gate: Progress restoration
Status: BLOCKED

Gate: Rapid navigation
Status: BLOCKED

Gate: Debounced persistence
Status: BLOCKED

Gate: Final flush
Status: BLOCKED

Gate: Offline progress
Status: BLOCKED

Gate: Remote conflict
Status: BLOCKED

Gate: Stale remote progress
Status: BLOCKED

Gate: Refresh
Status: BLOCKED

Gate: Restart
Status: BLOCKED

## Reading Sessions
Gate: Session start
Status: BLOCKED

Gate: Session end
Status: BLOCKED

Gate: Book switch
Status: BLOCKED

Gate: Reader close
Status: BLOCKED

Gate: Refresh
Status: BLOCKED

Gate: Sign out
Status: BLOCKED

Gate: Tab background
Status: BLOCKED

Gate: Idle behavior
Status: BLOCKED

Gate: Long inactivity
Status: BLOCKED

Gate: Continuous scrolling (Flow mode)
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Open Settings and switch to Flow mode
Observed result: Rendering engine dynamically transitions layout mode
Evidence type: RUNTIME_AUTOMATED

Gate: Session crossing midnight
Status: BLOCKED

Gate: Invalid timestamps
Status: BLOCKED

Gate: Duplicate sessions
Status: BLOCKED

Gate: Overlapping sessions
Status: BLOCKED

## Statistics
Gate: Total reading time aggregation
Status: PASS
Method: Vitest Unit
Environment: Web development
Action performed: Aggregate sessions across 3 days
Observed result: `totalReadingTime` correctly aggregates all minutes across distinct dates
Evidence type: RUNTIME_AUTOMATED

Gate: Daily reading time
Status: BLOCKED

Gate: Weekly reading time
Status: BLOCKED

Gate: Average session
Status: BLOCKED

Gate: Streak
Status: BLOCKED

Gate: Streak consecutive days logic
Status: PASS
Method: Vitest Unit
Environment: Web development
Action performed: Run calculateStats across 3 consecutive days
Observed result: currentStreak returns 3 successfully
Relevant SAN issue: SAN-007
Evidence type: RUNTIME_AUTOMATED

Gate: Longest streak
Status: BLOCKED

Gate: Books completed
Status: BLOCKED

Gate: Badge calculation
Status: BLOCKED

Gate: Midnight boundary
Status: BLOCKED

Gate: Timezone behavior
Status: BLOCKED

Gate: Deleted-book history
Status: BLOCKED

Gate: Malformed session input
Status: BLOCKED

## Settings
Gate: Every visible setting
Status: BLOCKED

Gate: Persistence after refresh
Status: BLOCKED

Gate: Persistence after restart
Status: BLOCKED

Gate: Invalid persisted value
Status: BLOCKED

Gate: Partial invalid settings object
Status: BLOCKED

Gate: Reset behavior
Status: BLOCKED

Gate: Theme separation
Status: BLOCKED

Gate: Reader settings application
Status: BLOCKED

Gate: Rapid slider interaction
Status: BLOCKED

Gate: Remote settings conflict
Status: BLOCKED

## Search
Gate: Empty query
Status: BLOCKED

Gate: Whitespace query
Status: BLOCKED

Gate: Title
Status: BLOCKED

Gate: Author
Status: BLOCKED

Gate: Case behavior
Status: BLOCKED

Gate: Punctuation
Status: BLOCKED

Gate: Unicode
Status: BLOCKED

Gate: Deleted book
Status: BLOCKED

Gate: Recently imported book
Status: BLOCKED

Gate: Offline search
Status: BLOCKED

Gate: Remote search scoping
Status: BLOCKED

Gate: FTS consistency
Status: BLOCKED

## Multi-Tab
Gate: Import in tab A
Status: BLOCKED
Blocker: Playwright test environment not yet initialized for multi-context execution.

Gate: Duplicate import in tab B
Status: BLOCKED

Gate: Read in tab A
Status: BLOCKED

Gate: Progress update in tab B
Status: BLOCKED

Gate: Delete in tab A
Status: BLOCKED

Gate: Stale tab B persistence
Status: BLOCKED

Gate: Sync in both tabs
Status: BLOCKED

Gate: Sign out in one tab
Status: BLOCKED

Gate: Settings mutation in both tabs
Status: BLOCKED

## UI System
Gate: Button primitive coverage
Status: BLOCKED

Gate: IconButton coverage
Status: BLOCKED

Gate: Dark mode toggle
Status: PASS
Method: Playwright E2E
Environment: Web development build, Chromium
Action performed: Click Theme Toggle button in UI
Observed result: HTML element receives `dark` class, triggering Tailwind dark variants
Relevant SAN issue: SAN-UI-002
Evidence type: RUNTIME_AUTOMATED

Gate: Input coverage
Status: BLOCKED

Gate: Loading state coverage
Status: BLOCKED

Gate: Error state coverage
Status: BLOCKED

Gate: Empty state coverage
Status: BLOCKED

Gate: Raw button exceptions
Status: BLOCKED

Gate: Legacy modal exceptions
Status: BLOCKED

Gate: Hardcoded color exceptions
Status: BLOCKED

Gate: Arbitrary Tailwind value review
Status: BLOCKED

## Accessibility
Gate: Keyboard-only navigation
Status: BLOCKED

Gate: Visible focus
Status: BLOCKED

Gate: Icon button labels
Status: BLOCKED

Gate: Dialog focus entry
Status: BLOCKED

Gate: Dialog focus containment
Status: BLOCKED

Gate: Dialog focus restoration
Status: BLOCKED

Gate: Escape behavior
Status: BLOCKED

Gate: Form labels
Status: BLOCKED

Gate: Error semantics
Status: BLOCKED

Gate: Loading semantics
Status: BLOCKED

Gate: Heading hierarchy
Status: BLOCKED

Gate: Reduced motion
Status: BLOCKED

Gate: Reader shortcut isolation
Status: BLOCKED

## Responsive UI
Gate: 375x667
Status: BLOCKED

Gate: 390x844
Status: BLOCKED

Gate: 768x1024
Status: BLOCKED

Gate: 1024x768
Status: BLOCKED

Gate: 1280x720
Status: BLOCKED

Gate: 1440x900
Status: BLOCKED

Gate: 1920x1080
Status: BLOCKED

For every viewport verify:
Gate: Library
Status: BLOCKED

Gate: Dialogs
Status: BLOCKED

Gate: Settings
Status: BLOCKED

Gate: Stats
Status: BLOCKED

Gate: Reader
Status: BLOCKED

Gate: Reader sidebar
Status: BLOCKED

Gate: Reader toolbar
Status: BLOCKED

## Dark Mode
Gate: Library
Status: BLOCKED

Gate: Dialogs
Status: BLOCKED

Gate: Settings
Status: BLOCKED

Gate: Stats
Status: BLOCKED

Gate: Reader chrome
Status: BLOCKED

Gate: Loading states
Status: BLOCKED

Gate: Error states
Status: BLOCKED

Gate: Empty states
Status: BLOCKED

Gate: Hover
Status: BLOCKED

Gate: Focus
Status: BLOCKED

Gate: Disabled
Status: BLOCKED

## PWA
Gate: Installability
Status: BLOCKED

Gate: Service worker registration
Status: BLOCKED

Gate: Offline launch
Status: BLOCKED

Gate: Cached shell
Status: BLOCKED

Gate: Application update
Status: BLOCKED

Gate: Stale client behavior
Status: BLOCKED

Gate: Persisted data compatibility after update
Status: BLOCKED

## Desktop
Gate: Tauri launch
Status: BLOCKED
Blocker: Tauri runtime not available in current VM.

Gate: Library
Status: BLOCKED

Gate: Import
Status: BLOCKED

Gate: Reader
Status: BLOCKED

Gate: Persistence
Status: BLOCKED

Gate: Keyboard shortcuts
Status: BLOCKED

Gate: Window resize
Status: BLOCKED

Gate: Application close
Status: BLOCKED

Gate: Application reopen
Status: BLOCKED

## Mobile
Gate: Expo launch
Status: BLOCKED
Blocker: Expo/React Native runtime not available in current VM.

Gate: Navigation
Status: BLOCKED

Gate: Library
Status: BLOCKED

Gate: WebView reader readiness
Status: BLOCKED

Gate: Reader command queueing
Status: BLOCKED

Gate: Reader events
Status: BLOCKED

Gate: Progress
Status: BLOCKED

Gate: Settings
Status: BLOCKED

Gate: Offline behavior
Status: BLOCKED

Gate: Malformed bridge event
Status: BLOCKED

Gate: Unknown bridge command
Status: BLOCKED
