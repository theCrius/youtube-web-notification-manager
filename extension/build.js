#!/usr/bin/env node
// Assembles loadable extension folders under extension/dist/<browser>/ by
// combining extension/shared/ (files identical across browsers) with each
// extension/<browser>/ folder (manifest.json + background.js, which differ
// enough between Firefox's background.scripts and Chrome's MV3
// service_worker that they aren't worth forcing into a shared file).
//
// Browsers can't load content scripts/pages that live outside an
// extension's own root folder, so this copy step is what lets
// extension/shared/ be the single source of truth while still producing a
// folder each browser can load directly ("Load unpacked" / "Load Temporary
// Add-on") - no bundler, just plain file copies.
//
// Usage: node extension/build.js
// Optionally set EXTENSION_VERSION to stamp manifest.json's "version" field
// in the built output (e.g. from a git tag in CI) - see applyVersionOverride
// below for why this doesn't just take the raw tag name as-is.

const fs = require("fs");
const path = require("path");

const EXTENSION_DIR = __dirname;
const SHARED_DIR = path.join(EXTENSION_DIR, "shared");
const DIST_DIR = path.join(EXTENSION_DIR, "dist");
const BROWSERS = ["firefox", "chrome"];

// Extension manifest versions must be 1-4 dot-separated integers (no "v"
// prefix, no prerelease suffixes like "-test") - see
// https://developer.chrome.com/docs/extensions/reference/manifest/version
const MANIFEST_VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

function copyFile(src, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, path.basename(src)));
}

function listFiles(dir) {
  return fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile());
}

function applyVersionOverride(destDir) {
  const requestedVersion = process.env.EXTENSION_VERSION;
  if (!requestedVersion) return;

  if (!MANIFEST_VERSION_PATTERN.test(requestedVersion)) {
    console.warn(
      `Not stamping version: "${requestedVersion}" isn't a valid manifest version (expected 1-4 dot-separated integers, e.g. "1.0.2"). Leaving the source manifest's version as-is.`
    );
    return;
  }

  const manifestPath = path.join(destDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  manifest.version = requestedVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

for (const browser of BROWSERS) {
  const srcDir = path.join(EXTENSION_DIR, browser);
  const destDir = path.join(DIST_DIR, browser);

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  for (const file of listFiles(SHARED_DIR)) {
    copyFile(path.join(SHARED_DIR, file), destDir);
  }
  for (const file of listFiles(srcDir)) {
    if (file === "README.md") continue; // dev doc, not part of the loadable extension
    copyFile(path.join(srcDir, file), destDir);
  }

  applyVersionOverride(destDir);

  console.log(`Built extension/dist/${browser}/`);
}
