/**
 * Run: node scripts/_capture.mjs
 * Starts a Vite dev server, captures screenshots, then stops the server.
 */
import puppeteer from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'screenshots');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PORT = 5174;
const BASE = `http://localhost:${PORT}`;

const CAPS = [
  { name: 'hero-commerce',  route: '/preview/redesign/home-multi', w:1280, h:720 },
  { name: 'hero-booking',   route: '/preview/redesign/services',   w:1280, h:720 },
  { name: 'hero-donations', route: '/preview/redesign/nonprofit',  w:1280, h:720 },
  { name: 'process-finale', route: '/preview/redesign/boutique',   w:900,  h:675 },
];

// Start Vite dev server
console.log('Starting Vite dev server on port', PORT, '...');
const vite = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: ROOT, shell: true, stdio: ['ignore', 'pipe', 'pipe'],
});
vite.stdout.on('data', d => process.stdout.write('[vite] ' + d));

// Wait until the port is accepting connections
await new Promise((resolve, reject) => {
  const deadline = Date.now() + 60_000;
  const check = () => {
    http.get(`${BASE}/`, (res) => { res.destroy(); resolve(); })
      .on('error', () => {
        if (Date.now() > deadline) return reject(new Error('Vite start timeout'));
        setTimeout(check, 800);
      });
  };
  check();
});
console.log('Server ready. Starting captures...\n');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

for (const c of CAPS) {
  const page = await browser.newPage();
  await page.setViewport({ width: c.w, height: c.h, deviceScaleFactor: 1 });
  process.stdout.write(`  ${c.name} (${c.w}×${c.h})...`);
  try {
    await page.goto(BASE + c.route, { waitUntil: 'networkidle0', timeout: 30_000 });
    await new Promise(r => setTimeout(r, 2000)); // let animations settle
    const path = join(OUT, c.name + '.png');
    await page.screenshot({ path, type: 'png' });
    process.stdout.write(` ✓\n`);
  } catch(e) {
    process.stdout.write(` ✗ ${e.message}\n`);
  }
  await page.close();
}

await browser.close();
vite.kill();
console.log('\n✅ Screenshots saved to public/screenshots/');
console.log('Update ENGINES[].img in src/pages/Index.tsx to use /screenshots/hero-*.png');
