/**
 * 端到端。真浏览器、真构建产物、真按住。
 *
 *   node scripts/e2e.mjs            # 本地 dist
 *   CHAOYUAN_URL=https://… node scripts/e2e.mjs   # 线上
 *
 * 任何一条不成立就退出码非零。
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.CHAOYUAN_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const LIVE = process.env.CHAOYUAN_URL ?? '';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
  if (!ok) process.exitCode = 1;
}

const HOLD_OK = 900;
const HOLD_SHORT = 300;

async function stage(page) {
  return page.evaluate(() => {
    const el = document.querySelector('#stage');
    return {
      index: Number(el?.getAttribute('data-index') ?? -1),
      phase: el?.getAttribute('data-phase') ?? '',
      posture: document.querySelector('#posture')?.textContent ?? '',
      count: document.querySelector('#count')?.textContent ?? '',
      hint: document.querySelector('#hint')?.textContent ?? '',
      on: document.querySelectorAll('.ticks li.on').length,
    };
  });
}

async function holdAt(page, x, y, ms) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
}

async function main() {
  const server = LIVE ? null : await startServer(resolve(root, 'dist'), 4328);
  const url = LIVE || server?.url;
  const browser = await chromium.launch({ executablePath: CHROME });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const errors = [];
  const foreign = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('file://') && !u.startsWith('data:')) foreign.push(u);
  });
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#scene');

    // ---- 首屏 ----
    const first = await stage(page);
    check('首屏停在无极', first.posture === '无极' && first.count === '未 起 势', `${first.posture} / ${first.count}`);
    check('首屏就写了怎么玩', first.hint === '按住 · 吸气', first.hint);
    check('十三格进度条都在', (await page.locator('.ticks li').count()) === 13);

    const box = await page.locator('#stage').boundingBox();
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.62;

    const painted = await page.evaluate(() => {
      const canvas = document.querySelector('#scene');
      if (!canvas) return { variance: 0, ink: 0 };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { variance: 0, ink: 0 };
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      let min = 255;
      let max = 0;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4 * 97) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
        if (v < 120) ink += 1;
      }
      return { variance: max - min, ink };
    });
    check('画布上真的有山有人', painted.variance > 60 && painted.ink > 20, `variance=${painted.variance} ink=${painted.ink}`);

    const fontOk = await page.evaluate(() => document.fonts.check('16px "Chaoyuan Serif"'));
    check('随包的中文衬线字体已加载', fontOk);

    // ---- 短按不进势 ----
    await holdAt(page, cx, cy, HOLD_SHORT);
    const duringShort = await stage(page);
    check('按下时进入吸气', duringShort.phase === 'inhale' && duringShort.hint === '松手 · 落势', duringShort.phase);
    await page.mouse.up();
    await page.waitForTimeout(1600);
    const afterShort = await stage(page);
    check('按太短不算一势', afterShort.index === 0 && afterShort.posture === '无极', `index=${afterShort.index}`);

    // ---- 长按进一势 ----
    await holdAt(page, cx, cy, HOLD_OK);
    await page.mouse.up();
    await page.waitForTimeout(1600);
    const afterOne = await stage(page);
    check('按够久进第一势', afterOne.index === 1 && afterOne.posture === '掤', `${afterOne.posture} #${afterOne.index}`);
    check('进度条点亮一格', afterOne.on === 1, `${afterOne.on}`);

    // ---- 键盘也能玩 ----
    await page.keyboard.down('Space');
    await page.waitForTimeout(HOLD_OK);
    await page.keyboard.up('Space');
    await page.waitForTimeout(1600);
    const afterKey = await stage(page);
    check('空格键同样能起势', afterKey.index === 2, `index=${afterKey.index}`);

    // ---- 走满十三势 ----
    for (let i = afterKey.index; i < 13; i += 1) {
      await holdAt(page, cx, cy, 760);
      await page.mouse.up();
      await page.waitForTimeout(1450);
    }
    await page.waitForTimeout(400);
    const done = await stage(page);
    check('十三势走满', done.index === 13 && done.phase === 'done', `${done.index}/${done.phase}`);
    check('收势写成朝元', done.posture === '朝元' && done.count === '十 三 势 已 满', `${done.posture} / ${done.count}`);
    check('收势时提示再走一遍', done.hint === '再走一遍', done.hint);
    check('十三个点全亮', done.on === 13, `${done.on}`);

    // ---- 再走一遍 ----
    await holdAt(page, cx, cy, HOLD_OK);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const again = await stage(page);
    check('走满后能从头再来', again.index === 1 && again.posture === '掤', `${again.index}/${again.posture}`);

    // ---- 版式没溢出 ----
    const overflow = await page.evaluate(() => {
      const stage = document.querySelector('#stage');
      const de = document.documentElement;
      return {
        scrollW: de.scrollWidth - window.innerWidth,
        scrollH: de.scrollHeight - window.innerHeight,
        stageW: stage?.clientWidth ?? 0,
      };
    });
    check('页面不出现滚动条', overflow.scrollW <= 0 && overflow.scrollH <= 0, JSON.stringify(overflow));

    // ---- 手机屏 ----
    const phone = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const mobile = await phone.newPage();
    const mobileErrors = [];
    mobile.on('pageerror', (e) => mobileErrors.push(String(e)));
    await mobile.goto(url, { waitUntil: 'networkidle' });
    await mobile.waitForSelector('#scene');
    const mFirst = await stage(mobile);
    check('手机上首屏同样成立', mFirst.posture === '无极' && mFirst.hint === '按住 · 吸气');

    const mBox = await mobile.locator('#stage').boundingBox();
    await mobile.touchscreen.tap(mBox.x + mBox.width / 2, mBox.y + mBox.height * 0.62);
    await mobile.waitForTimeout(900);
    const mAfterTap = await stage(mobile);
    check('轻点一下不会误进势', mAfterTap.index === 0, `index=${mAfterTap.index}`);
    check('手机上没有脚本报错', mobileErrors.length === 0, mobileErrors.join(' | '));

    const fits = await mobile.evaluate(() => {
      const r = document.querySelector('.readout')?.getBoundingClientRect();
      const t = document.querySelector('.title')?.getBoundingClientRect();
      if (!r || !t) return false;
      return r.right <= window.innerWidth + 1 && t.right <= window.innerWidth + 1 && r.top >= 0;
    });
    check('手机上文字不出框', fits);
    await phone.close();

    // ---- 减少动态 ----
    const calm = await browser.newContext({
      viewport: { width: 900, height: 900 },
      reducedMotion: 'reduce',
    });
    const calmPage = await calm.newPage();
    await calmPage.goto(url, { waitUntil: 'networkidle' });
    const calmBox = await calmPage.locator('#stage').boundingBox();
    await holdAt(calmPage, calmBox.x + calmBox.width / 2, calmBox.y + calmBox.height * 0.62, HOLD_OK);
    await calmPage.mouse.up();
    await calmPage.waitForTimeout(1600);
    const calmState = await stage(calmPage);
    check('偏好减少动态时照样能进势', calmState.index === 1, `index=${calmState.index}`);
    await calm.close();

    check('没有 console 报错', errors.length === 0, errors.join(' | '));
    check('没有任何外部请求', foreign.length === 0, foreign.slice(0, 3).join(' '));

    const passed = results.filter((r) => r.ok).length;
    process.stdout.write(`\n${passed}/${results.length} checks passed${LIVE ? ` (live: ${LIVE})` : ''}\n`);
  } finally {
    await browser.close();
    if (server) await server.close();
  }
}

await main();
