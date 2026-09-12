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
| [Storage Dashboard & Offline Caching](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/storage-manager-and-offline-caching.md) | Quota meter, selective offline caching & LRU cache eviction | Device Storage | None | VERIFIED |
| [Comic & Manga Archive (CBZ/CBR) Reader](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/comic-manga-cbz-cbr-support.md) | Sequential image archives, dual-spread & manga direction | Format Architecture | PDF Fixed-Layout | VERIFIED |
| [Annotation Knowledge Export & Markdown Sync](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/annotation-export-knowledge-sync.md) | Obsidian callouts, Markdown frontmatter & CSV export | Knowledge Management | Batch Library Ops | READY |
| [Interactive Dictionary & Vocabulary Builder](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/in-reader-dictionary-vocabulary-builder.md) | In-reader definition popover, audio phonetics & Leitner SRS | Reader Experience | In-Book TTS | READY |
| [Cross-Book Library Full-Text Search](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/cross-book-library-full-text-search.md) | Client-side inverted index, idle worker & global search | Search & Discovery | Batch Library Ops | READY |

*Status values: `READY` | `IN PROGRESS` | `VERIFIED` | `BLOCKED`*

## Architectural Sequencing & Dependencies

1. **Verified Core Capabilities**:
   - **Quality Gate & Format Resilience**: Zero ESLint warnings baseline and multi-format robustness tests.
   - **In-Book Speech Synthesis**: Continuous chapter walking and sentence highlighting with Foliate engine.
   - **Cloudflare D1 Reading Sync**: Conflict-free monotonic progress resolution and cross-device annotation sync.
   - **OPDS Catalog Feed Discovery**: Open catalog browsing (Standard Ebooks & Project Gutenberg) with direct import.
   - **Media Session Integration**: Extends speech synthesis to OS-level lockscreen, notification trays, and Bluetooth earbud controls.
   - **PDF Document Engine**: Adds fixed-layout PDF viewing and zoom controls without ballooning bundle size.
   - **Collections & Batch Library Management**: Empowers power readers with custom shelves, bulk editing, and multi-book management.
   - **Storage Management & Offline Caching**: Provides device storage visibility and selective offline cache retention.
   - **Comic & Manga Archive (CBZ/CBR) Reader**: Native image sequence unpacking, dual-page layout, and right-to-left manga orientation.
2. **Upcoming Capabilities**:
   - **Annotation Knowledge Export & Markdown Sync**: Obsidian-compatible Markdown export, blockquote callouts, and multi-book annotation bundles.
   - **Interactive Dictionary & Vocabulary Builder**: In-reader definition lookups and Leitner spaced-repetition vocabulary learning queue.
   - **Cross-Book Library Full-Text Search**: Inverted index across personal book collection with snippet previews and one-click navigation.

## Evaluated Architectural Alternatives

- **Full CRDT (Yjs / Automerge) for Annotations**: Evaluated and discarded as excessive overhead. Single-user multi-device sync with monotonic progress guards and timestamp-based D1 upserts provides conflict-free durability at < 5 kB footprint.
- **External XML Parser (fast-xml-parser / xmldom)**: Evaluated and discarded to protect the < 500 kB production bundle budget. The browser's native `DOMParser` parses OPDS Atom feeds with zero added dependencies.
- **epubjs Backward Compatibility Shims**: Purged completely. Foliate natively handles 8 formats, removing redundant legacy code.
