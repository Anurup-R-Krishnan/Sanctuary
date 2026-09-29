import { describe, expect, it } from "bun:test";

import { modelKeyFromPath } from "./[[path]]";

describe("modelKeyFromPath", () => {
  it("maps allowed model files to R2 keys", () => {
    expect(modelKeyFromPath(["onnx-community", "Kokoro-82M-v1.0-ONNX", "onnx", "model_quantized.onnx"])).toBe(
      "models/onnx-community/Kokoro-82M-v1.0-ONNX/onnx/model_quantized.onnx"
    );
  });

  it("rejects traversal and other models", () => {
    expect(modelKeyFromPath(["onnx-community", "Kokoro-82M-v1.0-ONNX", "..", "secret"])).toBeNull();
    expect(modelKeyFromPath(["users", "abc", "books"])).toBeNull();
    expect(modelKeyFromPath(undefined)).toBeNull();
  });
});
