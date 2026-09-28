import { describe, it, expect } from "bun:test";

import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from "./password";

describe("password utilities", () => {
  describe("hashPassword and verifyPassword", () => {
    it("should hash a password and verify it correctly", async () => {
      const password = "mySecurePassword123!";
      const hash = await hashPassword(password);

      // Hash should be in the correct format
      expect(hash).toMatch(/^pbkdf2\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);

      // Should verify the correct password
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const password = "mySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongPassword", hash);
      expect(isValid).toBe(false);
    });

    it("should reject an invalid hash format", async () => {
      const password = "mySecurePassword123!";
      const isValid = await verifyPassword(password, "invalid_hash");
      expect(isValid).toBe(false);
    });

    it("should handle special characters in password", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should handle unicode characters in password", async () => {
      const password = "パスワード日本語🎉";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should have different hashes for the same password (due to random salt)", async () => {
      const password = "samePassword";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("session token utilities", () => {
    it("should generate a session token", () => {
      const token = generateSessionToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
      // Should be base64url encoded
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate different tokens on each call", () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).not.toBe(token2);
    });

    it("should hash a session token", async () => {
      const token = generateSessionToken();
      const hash = await hashSessionToken(token);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      // Should be base64url encoded
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should produce the same hash for the same token", async () => {
      const token = generateSessionToken();
      const hash1 = await hashSessionToken(token);
      const hash2 = await hashSessionToken(token);

      expect(hash1).toBe(hash2);
    });
  });
});
