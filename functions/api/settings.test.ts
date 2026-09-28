import { describe, expect, it } from "bun:test";

import { fromDb, parseStoredSettings, settingsSchema } from "./settings";

const clientPayload = {
  accent: "#8B7355",
  bionicReading: true,
  customPalettes: [{ accent: "#111111", bg: "#F4ECD8", fg: "#5C4B37", id: "mine", name: "Mine" }],
  dailyGoal: 45,
  fontPairing: "lora",
  fontSize: 21,
  keybinds: { nextPage: ["ArrowRight", "l"] },
  maxTextWidth: 160,
  readingMode: "continuous",
  textWidth: 160,
  ttsVoiceURI: null,
  weeklyGoal: 300,
};

describe("settingsSchema", () => {
  it("accepts the full client payload including wide text widths", () => {
    expect(settingsSchema.safeParse(clientPayload).success).toBe(true);
  });

  it("rejects out-of-range goals and nested objects", () => {
    expect(settingsSchema.safeParse({ dailyGoal: 0 }).success).toBe(false);
    expect(settingsSchema.safeParse({ nested: { deep: { value: 1 } } }).success).toBe(false);
  });
});

describe("fromDb", () => {
  it("returns stored client settings without legacy defaults overriding them", () => {
    const row = { daily_goal: 45, settings_json: JSON.stringify(clientPayload), weekly_goal: 300 };
    const result = fromDb(row);
    expect(result.maxTextWidth).toBe(160);
    expect(result.accent).toBe("#8B7355");
    expect(result.fontPairing).toBe("lora");
  });

  it("does not invent text width or accent for rows without stored settings", () => {
    const result = fromDb({ daily_goal: 30, settings_json: "{}", weekly_goal: 150 });
    expect(result).toEqual({ dailyGoal: 30, weeklyGoal: 150 });
  });

  it("ignores corrupt stored JSON", () => {
    expect(parseStoredSettings("{not json")).toEqual({});
  });
});
