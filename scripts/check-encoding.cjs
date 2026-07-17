#!/usr/bin/env node
/**
 * Encoding guard: fails if any source file contains C1 control bytes (U+0080-U+009F)
 * or the corrupted-dash marker "ג€". These never appear in legitimate UTF-8 source and
 * are the fingerprint of the Hebrew-corruption incident (an editor saving .tsx files in
 * a non-UTF-8 encoding, turning Hebrew into gibberish on live stores).
 *
 * Wired into the deploy workflow BEFORE the build, so a corrupted commit fails CI and
 * never reaches users - regardless of whose editor produced it.
 */
const fs = require("fs");
const path = require("path");

const ROOTS = ["src", "supabase/functions", "functions"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const bad = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXTS.has(path.extname(e.name))) scan(p);
  }
}

function scan(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    let hit = null;
    for (const ch of line) {
      const o = ch.codePointAt(0);
      if (o >= 0x80 && o <= 0x9f) { hit = `U+${o.toString(16).padStart(4, "0")}`; break; }
    }
    if (!hit && line.includes("ג€")) hit = "corrupted-dash (ג€)";
    if (hit) bad.push(`${file.replace(/\\/g, "/")}:${i + 1}  [${hit}]`);
  });
}

for (const r of ROOTS) if (fs.existsSync(r)) walk(r);

if (bad.length) {
  console.error("\n❌ Corrupted text encoding detected in source (non-UTF-8 save mangled Hebrew).");
  console.error("   Fix the file's encoding (save as UTF-8) or restore it from a clean git version.\n");
  bad.slice(0, 60).forEach((b) => console.error("   " + b));
  if (bad.length > 60) console.error(`   ...and ${bad.length - 60} more`);
  console.error("");
  process.exit(1);
}
console.log("✓ encoding check passed - no corruption found");
