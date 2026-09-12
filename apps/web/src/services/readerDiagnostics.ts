export type ReaderDiagnosticStage =
  | "content-verification"
  | "content-retrieval"
  | "reader-initialization"
  | "reader-render";

export interface ReaderDiagnostic {
  bookId: string;
  details?: Record<string, unknown>;
  error?: string;
  stage: ReaderDiagnosticStage;
  timestamp: string;
}

const MAX_DIAGNOSTICS = 50;
const diagnostics: ReaderDiagnostic[] = [];

export function recordReaderDiagnostic(diagnostic: Omit<ReaderDiagnostic, "timestamp">): void {
  diagnostics.unshift({ ...diagnostic, timestamp: new Date().toISOString() });
  diagnostics.splice(MAX_DIAGNOSTICS);
  console.warn("[sanctuary-reader]", diagnostics[0]);
}

/** Useful from DevTools when a desktop EPUB cannot be reproduced elsewhere. */
export function getReaderDiagnostics(): readonly ReaderDiagnostic[] {
  return diagnostics;
}
