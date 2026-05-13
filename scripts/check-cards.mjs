#!/usr/bin/env node
/**
 * Eğitmen kartlarının boyutlarını ve overflow durumunu kontrol eder.
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://www.wellnessclub.tech';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Eğitmen kartlarını bul
  const cards = await page.$$('.trainer-card');
  console.log(`Found ${cards.length} trainer cards`);
  
  for (let i = 0; i < Math.min(cards.length, 6); i++) {
    const box = await cards[i].boundingBox();
    const text = await cards[i].innerText();
    const lines = text.split('\n').filter(l => l.trim());
    console.log(`Card ${i+1}: ${box?.width?.toFixed(0)}x${box?.height?.toFixed(0)}px | "${lines[0]}" | lines: ${lines.length}`);
  }

  // Kartların yükseklik farkını kontrol et
  const heights = [];
  for (const card of cards) {
    const box = await card.boundingBox();
    if (box) heights.push(box.height);
  }
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  console.log(`\nHeight range: ${minH.toFixed(0)}px - ${maxH.toFixed(0)}px (diff: ${(maxH-minH).toFixed(0)}px)`);
  
  if (maxH - minH > 20) {
    console.log('⚠️  Cards have uneven heights!');
  } else {
    console.log('✅ Cards are evenly sized');
  }

  await browser.close();
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
