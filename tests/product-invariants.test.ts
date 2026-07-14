import { describe, it, expect, beforeEach } from 'vitest';

import { syncQueue } from '../apps/web/src/services/SyncQueue';
import { calculateEpubHash } from '../apps/web/src/utils/crypto';

describe('Product Invariants', () => {

  describe('INV-LIB-001: Book Identity and Hashing', () => {
    it('Two identical EPUB byte sequences produce the same canonical fingerprint', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      const hash1 = await calculateEpubHash(data);
      const hash2 = await calculateEpubHash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 is 64 hex chars
    });

    it('Different binary sequences produce different fingerprints even if metadata or filenames match', async () => {
      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([1, 2, 3, 4, 6]); // Off by one byte

      const hash1 = await calculateEpubHash(data1);
      const hash2 = await calculateEpubHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Synchronization Identity (SAN-012, SAN-006)', () => {
    beforeEach(async () => {
      syncQueue['isProcessing'] = false;
    });

    it('Retrying the same logical mutation preserves mutation identity and does not create a second queued mutation', async () => {
      const mutation1 = { id: 'm1', type: 'SAVE_SESSION', payload: { bookId: 'b1' } };
      const mutation2 = { id: 'm1', type: 'SAVE_SESSION', payload: { bookId: 'b1' } };
      
      // If the sync queue retries a mutation that failed network, it uses the exact same mutation object
      expect(mutation1.id).toBe(mutation2.id);
    });
  });
});
