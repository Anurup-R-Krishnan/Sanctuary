#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 5174;
const webDir = normalize(join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "web"));
const rootDir = normalize(join(webDir, "dist"));

const build = spawnSync("npm", ["run", "build"], {
  cwd: webDir,
  stdio: "inherit",
  shell: true
});

if (build.status !== 0) {
  process.exit(build.status || 1);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safePath(urlPath) {
  const cleaned = (urlPath.split("?")[0] || "/").replace(/^\/+/, "");
  const resolved = normalize(join(rootDir, cleaned));
  if (!resolved.startsWith(rootDir)) return join(rootDir, "index.html");
  return resolved;
}

function serveFile(pathname) {
  try {
    const stats = statSync(pathname);
    if (stats.isDirectory()) return null;
    return readFileSync(pathname);
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  const targetPath = safePath(req.url || "/");
  const direct = serveFile(targetPath);
  const index = serveFile(join(rootDir, "index.html"));
  const body = direct || index;
  if (!body) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing mobile web build output");
    return;
  }
  const contentType = MIME_TYPES[extname(direct ? targetPath : "index.html")] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[desktop-dev] Serving apps/web/dist at http://127.0.0.1:${PORT}`);
});
