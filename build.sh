#!/usr/bin/env bash
# Desktop release build. Tauri runs the web build itself (beforeBuildCommand).
set -euo pipefail
bun run desktop:build
