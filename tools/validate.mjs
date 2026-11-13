// Checks features/features.json and the files it points at.
// Run: node tools/validate.mjs
// Exits with 1 if anything is wrong, so CI fails.

import { readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const featuresDir = join(root, "features");
const STATUSES = new Set(["stable", "planned"]);
const COMMAND_NAME = /^[a-z0-9][a-z0-9-]*$/;

const errors = [];
const seenIds = new Set();
const seenCommands = new Set();

const manifest = JSON.parse(await readFile(join(featuresDir, "features.json"), "utf8"));

if (!Array.isArray(manifest.features) || manifest.features.length === 0) {
  errors.push("features.json needs a non-empty \"features\" array");
}

for (const [i, f] of (manifest.features ?? []).entries()) {
  const where = `features[${i}]${f.id ? ` (${f.id})` : ""}`;

  for (const key of ["id", "name", "command", "file", "summary", "status"]) {
    if (typeof f[key] !== "string" || f[key].trim() === "") errors.push(`${where}: missing "${key}"`);
  }

  if (f.id && seenIds.has(f.id)) errors.push(`${where}: duplicate id "${f.id}"`);
  if (f.command && seenCommands.has(f.command)) errors.push(`${where}: duplicate command "${f.command}"`);
  seenIds.add(f.id);
  seenCommands.add(f.command);

  if (f.command && !COMMAND_NAME.test(f.command)) {
    errors.push(`${where}: command "${f.command}" must be lowercase letters, digits and dashes`);
  }
  if (f.status && !STATUSES.has(f.status)) errors.push(`${where}: status must be "stable" or "planned"`);
  if (f.file && !f.file.endsWith(".md")) errors.push(`${where}: file must be a .md file`);

  if (f.file) {
    const path = join(featuresDir, f.file);
    try {
      await access(path);
      const text = await readFile(path, "utf8");
      const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatter || !/^description:\s*\S/m.test(frontmatter[1])) {
        errors.push(`${where}: ${f.file} needs frontmatter with a description: line`);
      }
    } catch {
      errors.push(`${where}: file not found at features/${f.file}`);
    }
  }

  // extras: files the command runs (the scanner), installed under ~/.claude/<to>
  for (const e of f.extras ?? []) {
    if (typeof e.file !== "string" || typeof e.to !== "string" || e.to.startsWith("/") || e.to.includes("..")) {
      errors.push(`${where}: each extra needs "file" and a relative "to"`);
      continue;
    }
    try { await access(join(featuresDir, e.file)); } catch { errors.push(`${where}: extra not found at features/${e.file}`); }
  }
}

if (errors.length) {
  console.error("Registry problems:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`OK: ${manifest.features.length} feature(s) checked.`);
