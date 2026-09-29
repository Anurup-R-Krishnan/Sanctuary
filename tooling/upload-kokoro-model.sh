#!/usr/bin/env bash
set -euo pipefail

MODEL="onnx-community/Kokoro-82M-v1.0-ONNX"
BUCKET="${R2_BUCKET:-sanctuary}"
SOURCE="https://huggingface.co/${MODEL}/resolve/main"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

FILES=(config.json tokenizer.json tokenizer_config.json onnx/model_quantized.onnx)
VOICES=(af_heart af_bella af_nicole af_sarah af_kore am_michael am_fenrir am_puck bf_emma bf_isabella bm_george bm_fable)
for voice in "${VOICES[@]}"; do FILES+=("voices/${voice}.bin"); done

for file in "${FILES[@]}"; do
  mkdir -p "$WORK/$(dirname "$file")"
  echo "Downloading $file"
  curl -fL --retry 3 -o "$WORK/$file" "$SOURCE/$file"
  case "$file" in
    *.json) type="application/json" ;;
    *) type="application/octet-stream" ;;
  esac
  echo "Uploading models/$MODEL/$file"
  bunx wrangler r2 object put "$BUCKET/models/$MODEL/$file" --file "$WORK/$file" --content-type "$type" --remote
done

echo "Done. Build with VITE_KOKORO_MODEL_BASE=/models/ to serve the model from R2."
