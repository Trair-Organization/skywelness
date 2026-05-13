#!/usr/bin/env node
import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14
  
  await page.goto('https://www.wellnessclub.tech/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check for horizontal overflow
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = 390;
  console.log(`Body scroll width: ${bodyWidth}px (viewport: ${viewportWidth}px)`);
  if (bodyWidth > viewportWidth) {
    console.log('⚠️  HORIZONTAL OVERFLOW detected!');
  } else {
    console.log('✅ No horizontal overflow');
  }

  // Check slider
  const slider = await page.$('.hero-slider');
  if (slider) {
    const box = await slider.boundingBox();
    console.log(`Slider: ${box?.width}x${box?.height}px`);
    if (box && box.width > viewportWidth) {
      console.log('⚠️  Slider overflows viewport!');
    } else {
      console.log('✅ Slider fits viewport');
    }
  }

  // Check trainer cards
  const cards = await page.$$('.trainer-card');
  if (cards.length > 0) {
    const firstCard = await cards[0].boundingBox();
    console.log(`Trainer cards: ${cards.length} found, first: ${firstCard?.width?.toFixed(0)}x${firstCard?.height?.toFixed(0)}px`);
  }

  // Check nav
  const nav = await page.$('.public-nav');
  if (nav) {
    const navBox = await nav.boundingBox();
    console.log(`Nav: ${navBox?.width}x${navBox?.height?.toFixed(0)}px`);
  }

  await browser.close();
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
