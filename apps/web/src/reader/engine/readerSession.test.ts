import { describe, expect, it } from "bun:test";

import { getReaderEngineType } from "./ReaderSession";

describe("ReaderSession Facade", () => {
  it("determines active engine from URL or defaults", () => {
    expect(getReaderEngineType()).toBe("foliate");
  });
});

