import { describe, expect, it } from "bun:test";

import { splitForKokoro } from "./kokoroSpeechEngine";

describe("splitForKokoro", () => {
  it("keeps short text whole", () => {
    expect(splitForKokoro("A short sentence.")).toEqual(["A short sentence."]);
  });

  it("splits long text at punctuation into chunks of at most 110 characters", () => {
    const text = "Over the past eight months, our team identified and disrupted operations in which threat actors tried to use the model for malicious activity, including fraud, surveillance and influence campaigns across many regions.";
    const chunks = splitForKokoro(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 111)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });
});
