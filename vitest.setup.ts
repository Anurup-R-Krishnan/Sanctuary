import 'fake-indexeddb/auto';

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto;
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Mock crypto.subtle for hashing
if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = {
    digest: async (algo: string, data: BufferSource) => {
      // Mock SHA-256 for testing exact binary identity
      // In a real test environment with Node, we'd use crypto module
      // But vitest jsdom handles this via Node's crypto
      const cryptoModule = await import('crypto');
      const hash = cryptoModule.createHash('sha256');
      hash.update(new Uint8Array(data as ArrayBuffer));
      return new Uint8Array(hash.digest()).buffer;
    }
  } as SubtleCrypto;
}
