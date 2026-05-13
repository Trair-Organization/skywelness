#!/usr/bin/env node
/**
 * Site Screenshot Tool
 * Usage: node scripts/screenshot.mjs [url] [output-name]
 * Examples:
 *   node scripts/screenshot.mjs                          → homepage full page
 *   node scripts/screenshot.mjs /login                   → login page
 *   node scripts/screenshot.mjs /club/skyland            → club profile
 *   node scripts/screenshot.mjs /trainer/abc-123         → trainer profile
 *   node scripts/screenshot.mjs https://www.wellnessclub.tech/register
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://www.wellnessclub.tech';
const SCREENSHOTS_DIR = join(import.meta.dirname, '..', 'screenshots');

mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const rawPath = process.argv[2] || '/';
const outputName = process.argv[3] || rawPath.replace(/\//g, '_').replace(/^_/, '') || 'home';
const url = rawPath.startsWith('http') ? rawPath : `${BASE_URL}${rawPath.startsWith('/') ? rawPath : '/' + rawPath}`;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log(`📸 Opening: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for React to render
  await page.waitForTimeout(2000);
  
  // Full page screenshot
  const fullPath = join(SCREENSHOTS_DIR, `${outputName}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`✅ Full page: ${fullPath}`);
  
  // Viewport screenshot (above the fold)
  const viewportPath = join(SCREENSHOTS_DIR, `${outputName}-viewport.png`);
  await page.screenshot({ path: viewportPath });
  console.log(`✅ Viewport: ${viewportPath}`);
  
  await browser.close();
  console.log('Done!');
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
