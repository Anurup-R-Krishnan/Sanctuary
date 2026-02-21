#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (mode !== "dev" && mode !== "build") {
  console.error("[tauri-runner] Usage: node scripts/run-tauri.mjs <dev|build>");
  process.exit(2);
}

function requireTool(cmd, installHint) {
  const probe = spawnSync(cmd, ["--version"], { stdio: "pipe", encoding: "utf8" });
  if (probe.status === 0) return;
  console.error(`[tauri-runner] Missing required tool: ${cmd}`);
  console.error(`[tauri-runner] ${installHint}`);
  process.exit(1);
}

requireTool("cargo", "Install Rust with rustup: https://rustup.rs");
requireTool("rustc", "Install Rust with rustup: https://rustup.rs");

const args = ["exec", "tauri", mode];
const run = spawnSync("npm", args, { stdio: "inherit", shell: true });
if (run.status !== 0) {
  console.error("[tauri-runner] Tauri command failed.");
  console.error("[tauri-runner] Linux prerequisites: libwebkit2gtk-4.1-dev, libgtk-3-dev, libayatana-appindicator3-dev, librsvg2-dev");
  process.exit(run.status || 1);
}
