# Sanctuary desktop release checklist

Build the Linux AppImage from the repository root:

```bash
cd apps/desktop
./build-appimage.sh
```

Before release, verify these cases in the generated AppImage:

1. Launch with networking disabled.
2. Import a valid EPUB, close the app, and reopen it.
3. Open the imported EPUB and confirm the previous reading location restores.
4. Change reader settings, restart, and confirm they persist.
5. Import the same EPUB again and confirm duplicate detection is shown.
6. Try a non-EPUB file and a deliberately damaged EPUB.
7. Confirm damaged or missing local content is labelled in the library.
8. Use Retry and Open from start from the reader error screen.
9. Delete a book, restart, and confirm both its metadata and EPUB content are gone.
10. Sign in after guest use and confirm local-only books migrate without losing their EPUB bytes.

When an EPUB fails, open DevTools and run:

```js
getReaderDiagnostics()
```

This returns the most recent reader/content failures, including the book id,
failure stage, size/hash details where available, and the original error.
