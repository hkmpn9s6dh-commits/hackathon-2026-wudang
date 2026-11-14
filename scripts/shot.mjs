/**
 * 实拍。每一张都是真浏览器、真构建产物、真按住。
 *
 *   node scripts/shot.mjs
 *
 * 图落在 shots/，用来自己看，也用来给盲排的评委看。
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.CHAOYUAN_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const out = resolve(root, process.env.CHAOYUAN_SHOT_DIR ?? 'shots');
const DPR = Number(process.env.CHAOYUAN_SHOT_DPR ?? 2);

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 430, height: 932 };

async function hold(page, ms) {
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.waitForTimeout(ms);
}

async function main() {
  await mkdir(out, { recursive: true });
  const server = await startServer(resolve(root, 'dist'), Number(process.env.CHAOYUAN_PORT ?? 4327));
  const browser = await chromium.launch({ executablePath: CHROME });

  try {
    const page = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: DPR });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#scene');
    await page.waitForTimeout(600);
    await page.screenshot({ path: resolve(out, '01-first-screen.png') });

    await hold(page, 1200);
    await page.screenshot({ path: resolve(out, '02-inhale.png') });
    await page.mouse.up();
    await page.waitForTimeout(1400);

    // 走到第三势
    for (let i = 0; i < 2; i += 1) {
      await hold(page, 900);
      await page.mouse.up();
      await page.waitForTimeout(1400);
    }
    await page.screenshot({ path: resolve(out, '03-third.png') });

    // 走满十三势
    for (let i = 0; i < 10; i += 1) {
      await hold(page, 760);
      await page.mouse.up();
      await page.waitForTimeout(1350);
    }
    await page.waitForTimeout(700);
    await page.screenshot({ path: resolve(out, '04-done.png') });

    const phone = await browser.newPage({
      viewport: PHONE,
      deviceScaleFactor: DPR,
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(server.url, { waitUntil: 'networkidle' });
    await phone.waitForTimeout(600);
    await phone.screenshot({ path: resolve(out, '05-phone.png') });

    const box = await phone.locator('#stage').boundingBox();
    await phone.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.55);
    await phone.waitForTimeout(120);
    await phone.screenshot({ path: resolve(out, '06-phone-tap.png') });

    process.stdout.write(`shots → ${out}\n`);
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
