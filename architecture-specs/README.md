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
| [Annotation Knowledge Export & Markdown Sync](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/annotation-export-knowledge-sync.md) | Obsidian callouts, Markdown frontmatter & CSV export | Knowledge Management | Batch Library Ops | VERIFIED |
| [Interactive Dictionary & Vocabulary Builder](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/in-reader-dictionary-vocabulary-builder.md) | In-reader definition popover, audio phonetics & Leitner SRS | Reader Experience | In-Book TTS | VERIFIED |
| [Cross-Book Library Full-Text Search](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/cross-book-library-full-text-search.md) | Client-side inverted index, idle worker & global search | Search & Discovery | Batch Library Ops | VERIFIED |
| [Authenticated OPDS & Private Calibre Sync](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/authenticated-opds-and-calibre-sync.md) | Password-protected OPDS feeds, Calibre/Kavita/Komga integration | Library Management | OPDS Catalog Discovery | VERIFIED |
| [Custom Speech Voices & Natural Cadence](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/custom-tts-voices-and-audio-profiles.md) | Multi-lingual voice selection, smart paragraph pauses & audio dock | Reader Experience | In-Book TTS | VERIFIED |
| [Annual Reading Challenges & Habit Analytics](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/reading-challenges-and-habit-analytics.md) | Yearly book goals, ahead/behind pace calculation & streak preservation | Habit Formation | Storage Dashboard | VERIFIED |
| [Dynamic Chapter Reading Time & Adaptive Speed Estimator](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/dynamic-chapter-eta-and-reading-speed.md) | Real-time chapter ETA, reader velocity WPM & dual footer indicators | Reader Experience | Storage Dashboard | VERIFIED |
| [Quote Card Generator & Typographic Excerpt Staging](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/quote-card-generator-and-typographic-export.md) | High-DPI canvas quote cards, multi-ratio presets & social export | Reader Experience | Annotation Knowledge Sync | VERIFIED |
| [Fallback Generative SVG Book Covers](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/generative-svg-book-covers.md) | Procedural book cloth SVG covers, geometric motifs & deterministic palettes | Visual Design | PDF Fixed-Layout | VERIFIED |
| [High-Legibility Typography & Bionic Reading Fixation](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/bionic-reading-and-high-legibility.md) | Bionic fixation saccade acceleration, OpenDyslexic typeface & letter spacing | Accessibility | Quality Gate | VERIFIED |
| [Inline Footnote & Endnote Instant Popover](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/inline-footnote-instant-popover.md) | In-reader footnote preview popover, cross-document note resolution & backlink stripping | Reader Experience | High-Legibility Typography | VERIFIED |
| [Ambient Soundscapes & Focus Audio Synthesizer](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/ambient-soundscapes-and-focus-audio.md) | Procedural Web Audio API soundscapes, zero-asset acoustic masking & sleep timer | Reader Audio | In-Book Speech Synthesis | VERIFIED |
| [Multi-Color Highlighting & Sticky Marginalia Notes](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/multicolor-highlighting-and-marginalia.md) | 5-color semantic palette, one-tap color picker, marginalia notes & category filtering | Reader Experience | Annotation Knowledge Sync | VERIFIED |
| [Inline Image Lightbox & Deep Pan-Zoom Viewer](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/inline-image-lightbox-and-pan-zoom.md) | In-document image tap/click interception, pan-and-zoom modal & dark-mode inversion | Reader Experience | Inline Footnote Popover | VERIFIED |
| [RSVP Speed Reading & Visual Cadence Acceleration](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/rsvp-speed-reading-cadence.md) | Rapid serial visual presentation, ORP fixation anchor & cadence pacing | Reader Experience | High-Legibility Typography | VERIFIED |
| [Zen Focus Immersion & Timed Reading Sprints](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/zen-focus-immersion-and-sprints.md) | Distraction-free full-bleed reading, ambient edge vignette & Web Audio focus sprints | Reader Experience | Ambient Soundscapes | VERIFIED |
| [Chapter Readability & Cognitive Complexity Metrics](file:///home/anuruprkris/Project/sanctuary-book-reader/architecture-specs/chapter-readability-and-complexity.md) | Flesch ease, Kincaid grade level, Gunning fog, lexical diversity & polysyllabic analytics | Reader Experience | Dynamic Reading Speed | VERIFIED |

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
   - **Annotation Knowledge Export & Markdown Sync**: Obsidian-compatible Markdown export, blockquote callouts, and multi-book annotation bundles.
   - **Interactive Dictionary & Vocabulary Builder**: In-reader definition lookups and Leitner spaced-repetition vocabulary learning queue.
   - **Cross-Book Library Full-Text Search**: Inverted index across personal book collection with snippet previews and one-click navigation.
   - **Authenticated OPDS & Private Calibre Sync**: Password-protected feeds for personal Calibre, Kavita, and Komga library servers.
   - **Custom Speech Voices & Natural Cadence**: Multi-lingual voice selection, persistent book voice preferences, and smart breathing pauses.
   - **Annual Reading Challenges & Habit Analytics**: Yearly reading goals with dynamic ahead/behind pace calculation and milestone badges.
   - **Dynamic Chapter Reading Time & Adaptive Speed Estimator**: Real-time chapter ETA, calibrated reading speed (WPM), and dual footer indicators.
   - **Quote Card Generator & Typographic Excerpt Staging**: High-DPI canvas quote cards, 4 aesthetic themes, multi-ratio presets, and social export.
   - **Fallback Generative SVG Book Covers**: Procedural book cloth SVG covers, deterministic palettes, foil framing, and spine crease shading.
   - **Inline Footnote & Endnote Instant Popover**: In-reader footnote preview popover, cross-document note resolution & backlink stripping.
   - **Ambient Soundscapes & Focus Audio Synthesizer**: Procedural Web Audio API soundscapes, zero-asset acoustic masking & sleep timer.
   - **Multi-Color Highlighting & Sticky Marginalia Notes**: 5-color semantic palette, one-tap color picker, marginalia notes & category filtering.
   - **Inline Image Lightbox & Deep Pan-Zoom Viewer**: In-document image click/tap interception, pan-and-zoom modal & dark-mode inversion.
   - **RSVP Speed Reading & Visual Cadence Acceleration**: Rapid serial visual presentation, optimal recognition point (ORP) fixation, and variable cadence.
   - **Zen Focus Immersion & Timed Reading Sprints**: Distraction-free full-bleed reading, ambient edge vignette, and Web Audio focus sprint bells.
   - **Chapter Readability & Cognitive Complexity Metrics**: Flesch reading ease, Kincaid grade level, Gunning fog, lexical diversity, and polysyllabic vocabulary inspection.

## Evaluated Architectural Alternatives

- **Full CRDT (Yjs / Automerge) for Annotations**: Evaluated and discarded as excessive overhead. Single-user multi-device sync with monotonic progress guards and timestamp-based D1 upserts provides conflict-free durability at < 5 kB footprint.
- **External XML Parser (fast-xml-parser / xmldom)**: Evaluated and discarded to protect the < 500 kB production bundle budget. The browser's native `DOMParser` parses OPDS Atom feeds with zero added dependencies.
- **epubjs Backward Compatibility Shims**: Purged completely. Foliate natively handles 8 formats, removing redundant legacy code.
