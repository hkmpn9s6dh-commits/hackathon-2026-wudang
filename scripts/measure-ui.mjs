/**
 * 界面卫生，在真浏览器里量，不靠嘴说。
 *
 *   node scripts/measure-ui.mjs
 *
 * 写 proof/ui/report.md；任何一条不合格就退出码非零。
 * 这是地板不是判决：过了它不代表这画好看。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.CHAOYUAN_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';

const TYPO = [
  { id: 'title', selector: '.title', min: 44, note: '题名' },
  { id: 'posture', selector: '.posture', min: 42, note: '势名' },
  { id: 'gloss', selector: '.gloss', min: 16, note: '一句白话' },
  { id: 'verse', selector: '.verse', min: 14, note: '歌诀' },
  { id: 'hint', selector: '.hint', min: 14, note: '操作提示' },
  { id: 'count', selector: '.count', min: 11, note: '第几势' },
  { id: 'subtitle', selector: '.subtitle', min: 13, note: '副题' },
];

const VIEWPORTS = [
  { name: '桌面 1440×900', width: 1440, height: 900 },
  { name: '笔记本 1280×720', width: 1280, height: 720 },
  { name: '手机 430×932', width: 430, height: 932, mobile: true },
  { name: '小屏 360×640', width: 360, height: 640, mobile: true },
];

async function main() {
  const server = await startServer(resolve(root, 'dist'), 4329);
  const browser = await chromium.launch({ executablePath: CHROME });
  const rows = [];
  let failed = 0;

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: Boolean(vp.mobile),
        hasTouch: Boolean(vp.mobile),
      });
      const page = await context.newPage();
      await page.goto(server.url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#scene');

      // 走到第三势，让文字都在最长的状态
      const box = await page.locator('#stage').boundingBox();
      for (let i = 0; i < 3; i += 1) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.62);
        await page.mouse.down();
        await page.waitForTimeout(760);
        await page.mouse.up();
        await page.waitForTimeout(1400);
      }

      for (const rule of TYPO) {
        const size = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return Number.parseFloat(getComputedStyle(el).fontSize);
        }, rule.selector);
        const ok = typeof size === 'number' && size + 0.01 >= rule.min;
        if (!ok) failed += 1;
        rows.push({ vp: vp.name, id: rule.id, note: rule.note, size, min: rule.min, ok });
      }

      // 文字块互相不压：题名 / 读数 / 页脚
      const overlap = await page.evaluate(() => {
        const pick = (s) => document.querySelector(s)?.getBoundingClientRect() ?? null;
        const a = pick('.readout');
        const b = pick('.title');
        const c = pick('.foot');
        const d = pick('.verse');
        const hit = (r1, r2) =>
          r1 && r2 && !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
        return {
          readoutTitle: hit(a, b),
          readoutFoot: hit(a, c),
          verseFoot: hit(d, c),
          verseReadout: hit(d, a),
          inside: [a, b, c, d].every(
            (r) => !r || (r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1),
          ),
        };
      });
      const overlapOk =
        !overlap.readoutTitle && !overlap.readoutFoot && !overlap.verseFoot && !overlap.verseReadout && overlap.inside;
      if (!overlapOk) failed += 1;
      rows.push({ vp: vp.name, id: 'layout', note: '文字块不压不越界', size: 0, min: 0, ok: overlapOk, detail: JSON.stringify(overlap) });

      await context.close();
    }

    const body = rows
      .map((r) => `| ${r.vp} | ${r.id} | ${r.note} | ${r.min || '-'} | ${r.size ? r.size.toFixed(1) : '-'} | ${r.ok ? 'ok' : 'FAIL'} |`)
      .join('\n');
    const report = `# 界面量测\n\n自动生成：\`node scripts/measure-ui.mjs\`。这里只管卫生（字号、压字、越界），不判过线。\n\n| 视口 | 项 | 说明 | 下限(px) | 实测(px) | 结果 |\n| --- | --- | --- | --- | --- | --- |\n${body}\n\n合计 ${rows.length} 项，失败 ${failed} 项。\n`;
    await mkdir(resolve(root, 'proof/ui'), { recursive: true });
    await writeFile(resolve(root, 'proof/ui/report.md'), report, 'utf8');
    process.stdout.write(report);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
