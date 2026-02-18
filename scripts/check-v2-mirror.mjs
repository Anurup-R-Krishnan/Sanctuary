#!/usr/bin/env node
import { execFileSync } from "node:child_process";

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getChangedFiles(baseRef) {
  const mergeBase = runGit(["merge-base", "HEAD", baseRef]);
  const out = runGit(["diff", "--name-only", `${mergeBase}..HEAD`]);
  if (!out) return [];
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function isV2FrontendFeatureFile(path) {
  return (
    path.startsWith("apps/mobile/src/screens/") ||
    path.startsWith("apps/mobile/src/services/") ||
    path.startsWith("apps/mobile/src/reader/")
  );
}

function isMirrorMapFile(path) {
  return path === "V2_MIRROR_MAP.md";
}

function isV2BackendFile(path) {
  return path.startsWith("functions/api/v2/") && path.endsWith(".ts");
}

const baseRef = process.argv[2] || process.env.MIRROR_BASE_REF || "main";
const changedFilesEnv = process.env.MIRROR_CHANGED_FILES;

let files;
if (changedFilesEnv && changedFilesEnv.trim()) {
  files = changedFilesEnv
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
} else {
  try {
    files = getChangedFiles(baseRef);
  } catch (err) {
    console.error("[mirror-guard] Unable to compute changed files.");
    console.error("Set MIRROR_CHANGED_FILES to bypass local git-spawn restrictions.");
    console.error(String(err));
    process.exit(2);
  }
}

const frontendTouched = files.some(isV2FrontendFeatureFile);
if (!frontendTouched) {
  console.log("[mirror-guard] No V2 frontend feature files changed. Check passed.");
  process.exit(0);
}

const backendTouched = files.some(isV2BackendFile);
const mirrorMapTouched = files.some(isMirrorMapFile);

if (!backendTouched || !mirrorMapTouched) {
  console.error("[mirror-guard] V2 frontend feature change detected without full mirror updates.");
  console.error("[mirror-guard] Requirements:");
  console.error("  1) At least one change under functions/api/v2/");
  console.error("  2) V2_MIRROR_MAP.md updated");
  console.error("[mirror-guard] Changed files:");
  for (const file of files) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

console.log("[mirror-guard] Mirror policy satisfied.");
