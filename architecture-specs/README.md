# Sanctuary Architecture & Feature Modules Index

Generated against commit `553e7f6`.
Execute features in the recommended dependency order below.
Each module contains self-contained technical specifications, scope definitions, and verification criteria.

## Feature Modules & Verification Status

| Module Specification | Architectural Responsibility | Category | Dependencies | Status |
|---|---|---|---|---|
| [Quality Gate & Multi-Format Robustness](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/quality-gate-and-format-resilience.md) | Zero-tolerance lint baseline & parser edge-case resilience | Quality Assurance | None | VERIFIED |
| [Audio & Synchronized In-Book TTS](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/audio-speech-synthesis.md) | Continuous speech synthesis, sentence tracking & audio dock | Reader Engine | None | VERIFIED |
| [Cloudflare D1 Reading State Sync](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/cloud-reading-sync-d1.md) | Monotonic reading progress & cloud annotation synchronization | Persistence & Cloud | None | VERIFIED |
| [OPDS 1.2 & 2.0 Catalog Feed Discovery](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/opds-catalog-discovery.md) | Open catalog browsing and 1-click book downloading | Library Management | None | VERIFIED |
| [Native Media Session Audio Integration](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/media-session-background-audio.md) | System lockscreen controls & background audio playback | Reader Engine | In-Book TTS | VERIFIED |
| [Native PDF Fixed-Layout Support](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/pdf-fixed-layout-support.md) | PDF document ingestion, canvas rendering & zoom controls | Format Architecture | None | VERIFIED |
| [Collections & Batch Library Operations](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/library-collections-and-batch-ops.md) | Custom shelves, metadata editing & multi-select actions | Library Management | D1 Reading Sync | VERIFIED |
| [Storage Dashboard & Offline Caching](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/storage-manager-and-offline-caching.md) | Quota meter, selective offline caching & LRU cache eviction | Device Storage | None | READY |

*Status values: `READY` | `IN PROGRESS` | `VERIFIED` | `BLOCKED`*

## Architectural Sequencing & Dependencies

1. **Verified Core Capabilities**:
   - **Quality Gate & Format Resilience**: Zero ESLint warnings baseline and multi-format robustness tests.
   - **In-Book Speech Synthesis**: Continuous chapter walking and sentence highlighting with Foliate engine.
   - **Cloudflare D1 Reading Sync**: Conflict-free monotonic progress resolution and cross-device annotation sync.
   - **OPDS Catalog Feed Discovery**: Open catalog browsing (Standard Ebooks & Project Gutenberg) with direct import.
2. **Upcoming Capabilities**:
   - **Media Session Integration**: Extends speech synthesis to OS-level lockscreen, notification trays, and Bluetooth earbud controls.
   - **PDF Document Engine**: Adds fixed-layout PDF viewing and zoom controls without ballooning bundle size.
   - **Collections & Batch Library Management**: Empowers power readers with custom shelves, bulk editing, and multi-book management.
   - **Storage Management & Offline Caching**: Provides device storage visibility and selective offline cache retention.

## Evaluated Architectural Alternatives

- **Full CRDT (Yjs / Automerge) for Annotations**: Evaluated and discarded as excessive overhead. Single-user multi-device sync with monotonic progress guards and timestamp-based D1 upserts provides conflict-free durability at < 5 kB footprint.
- **External XML Parser (fast-xml-parser / xmldom)**: Evaluated and discarded to protect the < 500 kB production bundle budget. The browser's native `DOMParser` parses OPDS Atom feeds with zero added dependencies.
- **epubjs Backward Compatibility Shims**: Purged completely. Foliate natively handles 8 formats, removing redundant legacy code.
