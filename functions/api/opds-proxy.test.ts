import { describe, expect, it } from "bun:test";

import { isBlockedHost } from "./opds-proxy";

describe("isBlockedHost", () => {
  it.each([
    "localhost", "localhost.", "api.localhost", "printer.local", "db.internal",
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1",
    "[::1]", "[::]", "[::ffff:127.0.0.1]", "[::a00:1]", "[fd00::1]", "[fe80::1]", "[fec0::1]", "[64:ff9b::a00:1]",
  ])("blocks %s", (host) => {
    expect(isBlockedHost(host)).toBe(true);
  });

  it.each(["www.gutenberg.org", "m.gutenberg.org", "8.8.8.8", "[2606:4700::1111]", "172.32.0.1"])("allows %s", (host) => {
    expect(isBlockedHost(host)).toBe(false);
  });
});
