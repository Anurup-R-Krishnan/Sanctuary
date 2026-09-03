const fs = require('fs');
const filepath = 'apps/web/src/components/pages/ReaderView.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldBlock = `
        // Only fetch if we don't have it in our local hydrated state
        setHydratedBook((prev) => {
            if (!prev?.epubBlob && !isFetchingRef.current) {
                isFetchingRef.current = true;
                setIsFetchingContent(true);
                getBookContent(activeBook.id)
                    .then(blob => {
                        if (isMounted) {
                            setHydratedBook(curr => curr ? { ...curr, epubBlob: blob } : undefined);
                            setContentError(null);
                        }
                    })
                    .catch(err => {
                        console.error("Failed to load book content:", err);
                        if (isMounted) {
                            setContentError("Book content is unavailable on this device.");
                        }
                    })
                    .finally(() => {
                        if (isMounted) {
                            setIsFetchingContent(false);
                            isFetchingRef.current = false;
                        }
                    });
            }
            return prev;
        });`;

const newBlock = `
        // Check if we need to fetch the blob.
        // We use activeBook to see if it inherently lacked the blob.
        // We avoid calling async functions and side-effects inside setState!
        if (!activeBook.epubBlob && !isFetchingRef.current) {
            isFetchingRef.current = true;
            setIsFetchingContent(true);
            getBookContent(activeBook.id)
                .then(blob => {
                    if (isMounted) {
                        setHydratedBook(curr => curr ? { ...curr, epubBlob: blob } : undefined);
                        setContentError(null);
                    }
                })
                .catch(err => {
                    console.error("Failed to load book content:", err);
                    if (isMounted) {
                        setContentError("Book content is unavailable on this device.");
                    }
                })
                .finally(() => {
                    if (isMounted) {
                        setIsFetchingContent(false);
                        isFetchingRef.current = false;
                    }
                });
        }`;

// We need to match it robustly because spacing might be slightly off.
// Let's just find the start and end of the setHydratedBook block for the fetch.

const startIndex = content.indexOf('        // Only fetch if we don\'t have it in our local hydrated state');
const matchEnd = '            return prev;\n        });';
const endIndex = content.indexOf(matchEnd) + matchEnd.length;

if (startIndex !== -1 && endIndex > startIndex) {
    const updated = content.slice(0, startIndex) + newBlock.trimStart() + content.slice(endIndex);
    fs.writeFileSync(filepath, updated, 'utf8');
    console.log("Patched fetching effect.");
} else {
    console.log("Could not find patch bounds.");
    console.log("start:", startIndex, "end:", endIndex);
}
