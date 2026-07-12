/**
 * capture-screenshots.js
 * ---------------------
 * Captures real screenshots of Siango store previews and onboarding screens,
 * then saves them to /public/screenshots/ for use as landing page images.
 *
 * Usage:
 *   node scripts/capture-screenshots.js [--port 5173]
 *
 * Requires the dev server to be running (npm run dev).
 * If the dev server is not running, starts a temporary one automatically.
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'screenshots');

// ── What to capture ──────────────────────────────────────────────────────────
const CAPTURES = [
  // Hero images (16:9, 1280×720) — one per engine tab
  {
    name: 'hero-commerce',
    route: '/preview/redesign/home-multi?screenshot',
    width: 1280, height: 720,
    waitFor: '.storefront-hero, [class*="hero"], main', // first meaningful element
    scrollTo: 0,
  },
  {
    name: 'hero-booking',
    route: '/preview/redesign/services?screenshot',
    width: 1280, height: 720,
    waitFor: 'main',
    scrollTo: 0,
  },
  {
    name: 'hero-donations',
    route: '/preview/redesign/nonprofit?screenshot',
    width: 1280, height: 720,
    waitFor: 'main',
    scrollTo: 0,
  },

  // HowItWorks process images (4:3, 900×675)
  {
    name: 'process-a',
    route: '/onboarding?screenshot&step=0',
    width: 900, height: 675,
    waitFor: 'form, .onboarding-step, main',
    scrollTo: 0,
  },
  {
    name: 'process-b',
    route: '/onboarding?screenshot&step=1',
    width: 900, height: 675,
    waitFor: 'form, .onboarding-step, main',
    scrollTo: 0,
  },
  {
    name: 'process-c',
    route: '/onboarding?screenshot&step=4',
    width: 900, height: 675,
    waitFor: 'form, .onboarding-step, main',
    scrollTo: 0,
  },
  {
    name: 'process-finale',
    route: '/preview/redesign/home-multi?screenshot',
    width: 900, height: 675,
    waitFor: 'main',
    scrollTo: 0,
  },
];

// ── Port detection ────────────────────────────────────────────────────────────
function parsePort() {
  const idx = process.argv.indexOf('--port');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
}

async function findRunningDevServer() {
  const candidates = [52979, 5173, 5174, 5175, 3000, 8080];
  const { default: http } = await import('http');
  for (const port of candidates) {
    const alive = await new Promise(resolve => {
      const req = http.get(`http://localhost:${port}/`, r => {
        resolve(r.statusCode < 500);
        r.destroy();
      });
      req.on('error', () => resolve(false));
      req.setTimeout(800, () => { req.destroy(); resolve(false); });
    });
    if (alive) {
      console.log(`✓ Dev server found on port ${port}`);
      return port;
    }
  }
  return null;
}

async function startDevServer() {
  console.log('⟳ Starting dev server…');
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: ROOT, shell: true, stdio: 'pipe',
  });
  // Wait for Vite's "ready" line
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dev server start timeout')), 60_000);
    proc.stdout.on('data', data => {
      const txt = data.toString();
      if (txt.includes('localhost:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.on('error', reject);
  });
  // A tiny extra delay for Vite to finish HMR warm-up
  await new Promise(r => setTimeout(r, 2000));
  const port = await findRunningDevServer();
  if (!port) throw new Error('Dev server started but no port found');
  return { proc, port };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const forcedPort = parsePort();
  let port = forcedPort ?? await findRunningDevServer();
  let devProc = null;

  if (!port) {
    const result = await startDevServer();
    devProc = result.proc;
    port = result.port;
  }

  const BASE = `http://localhost:${port}`;
  console.log(`\n📸 Capturing ${CAPTURES.length} screenshots → ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const cap of CAPTURES) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: cap.width, height: cap.height });

    const url = `${BASE}${cap.route}`;
    console.log(`  → ${cap.name}  (${url})`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Try to wait for a meaningful element; fall back gracefully
      try {
        await page.waitForSelector(cap.waitFor, { timeout: 8_000 });
      } catch {
        // element not found — screenshot whatever rendered
      }

      // Scroll to desired position
      if (cap.scrollTo) await page.evaluate(y => window.scrollTo(0, y), cap.scrollTo);

      // Give animations time to settle
      await page.waitForTimeout(800);

      const outPath = join(OUT_DIR, `${cap.name}.png`);
      await page.screenshot({ path: outPath, type: 'png' });
      console.log(`     ✓ saved ${cap.name}.png`);
    } catch (err) {
      console.error(`     ✗ FAILED: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  if (devProc) devProc.kill();

  console.log(`\n✅ Done! Screenshots saved to public/screenshots/\n`);
  console.log('Next: update ENGINES[].img and PROCESS_IMGS[] in src/pages/Index.tsx');
  console.log('  to use "/screenshots/hero-commerce.png" etc.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
