# Sanctuary desktop release checklist

Build the Linux AppImage from the repository root:

```bash
cd apps/desktop
./build-appimage.sh
```

Before release, verify these cases in the generated AppImage:

1. Launch with networking disabled.
2. Import valid books across supported formats (EPUB, FB2, MOBI, AZW, AZW3, TXT, HTML, Markdown), close the app, and reopen it.
3. Open an imported book and confirm the previous reading location restores.
4. Change reader settings, restart, and confirm they persist.
5. Import the same book again and confirm duplicate detection is shown.
6. Try an unsupported file (e.g. PDF/DOCX) and a deliberately damaged archive to verify error toasts.
7. Confirm damaged or missing local content is labelled in the library.
8. Use Retry and Open from start from the reader error screen.
9. Delete a book, restart, and confirm both its metadata and book content are gone.
10. Sign in after guest use and confirm local-only books migrate without losing their content bytes.

When a book load fails, open DevTools and run:

```js
getReaderDiagnostics()
```

This returns the most recent reader/content failures, including the book id,
failure stage, size/hash details where available, and the original error.
