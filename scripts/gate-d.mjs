/**
 * 闸 D 的尺子：抓 5 张同级参考画面，和本作品混在一起、随机字母命名，做成盲排包。
 *
 *   node scripts/gate-d.mjs
 *
 * 产出 proof/gate-d/tiles/*.png 与 proof/gate-d/sheet.png，以及给评委的任务书。
 * 抓不到的站点会跳过并在 pack.md 里写明——尺子先说清是哪五件，不装。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { startServer } from './serve.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME =
  process.env.CHAOYUAN_CHROME ??
  'C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const out = resolve(root, 'proof/gate-d');
const W = 1200;
const H = 800;

const REFS = [
  {
    id: 'teamlab',
    name: 'teamLab 互动数字艺术',
    why: '互动数字艺术的通行语法：手一碰画面立刻回应',
    url: 'https://www.teamlab.art/e/',
  },
  {
    id: 'dpm',
    name: '故宫博物院 数字文物库',
    why: '文博数字展陈的视觉基准：底色、留白、字的层级',
    url: 'https://digicol.dpm.org.cn/',
  },
  {
    id: 'hnm',
    name: '湖南博物院',
    why: '国内文博数字化的整屏处理',
    url: 'https://www.hnmuseum.com/',
  },
  {
    id: 'chnmuseum',
    name: '中国国家博物馆',
    why: '国家级展陈的数字门面',
    url: 'https://www.chnmuseum.cn/',
  },
  {
    id: 'szmuseum',
    name: '苏州博物馆',
    why: '江南审美的数字表达：留白与灰度最讲分寸',
    url: 'https://www.szmuseum.com/',
  },
  {
    id: 'sxd',
    name: '三星堆博物馆',
    why: '强 IP 题材的数字展陈',
    url: 'https://www.sxd.cn/',
  },
];

async function main() {
  await mkdir(resolve(out, 'tiles'), { recursive: true });
  const server = await startServer(resolve(root, 'dist'), 4333);
  const browser = await chromium.launch({
    executablePath: CHROME,
    proxy: process.env.CHAOYUAN_PROXY ? { server: process.env.CHAOYUAN_PROXY } : undefined,
  });

  const tiles = [];

  // 本作品：手机竖屏整屏，缩到 3:2 的画布里居中
  const mine = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await mine.goto(server.url, { waitUntil: 'networkidle' });
  await mine.waitForTimeout(800);
  await mine.screenshot({ path: resolve(out, 'tiles/entry.png') });
  tiles.push({ id: 'entry', name: '本作品《朝元》', own: true });
  await mine.close();

  for (const ref of REFS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 });
    try {
      const res = await page.goto(ref.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      if (!res || res.status() >= 400) throw new Error(`status ${res?.status()}`);
      await page.screenshot({ path: resolve(out, `tiles/${ref.id}.png`) });
      tiles.push({ id: ref.id, name: ref.name, why: ref.why, url: ref.url });
      process.stdout.write(`ok   ${ref.id}\n`);
    } catch (error) {
      process.stdout.write(`skip ${ref.id}: ${String(error).slice(0, 80)}\n`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  await server.close();

  // 随机字母，只有 pack.md 里有对照表；评委只看 sheet
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const order = tiles
    .map((t, i) => ({ t, k: (i * 7919) % 101 }))
    .sort((a, b) => a.k - b.k)
    .map((x, i) => ({ ...x.t, letter: letters[i] }));
  await writeFile(
    resolve(out, 'pack.md'),
    `# 闸 D · 盲排包\n\n生成：\`node scripts/gate-d.mjs\`。评委只看 \`sheet.png\`，字母与作品的对应关系在本文，不给评委。\n\n| 字母 | 作品 | 为什么拿它当尺子 | 来源 |\n| --- | --- | --- | --- |\n${order
      .map((o) => `| ${o.letter} | ${o.name} | ${o.why ?? '—'} | ${o.url ?? '本仓库构建产物'} |`)
      .join('\n')}\n\n## 任务书（原样发给评委）\n\n> 下面 ${order.length} 张画面，是同一类「文旅 / 文博 / 数字展陈」作品的首屏。\n> 请只凭画面本身，排出你「第一眼会停下来看」的顺序，从最想看到最不想看。\n> 每条给一句理由：停下来的真正原因（好奇 / 舒服 / 看不懂 / 像模板 / 太满 …）。\n> 不要查任何资料，不要猜作者。最后单独说一句：最不像「文旅数字作品」的是哪一张，为什么。\n`,
    'utf8',
  );
  // 拼成一张联系表：三列，每格 3:2，左上角一个大字母，别的什么都不给
  const tilesHtml = order
    .map((o) => {
      const path = pathToFileURL(resolve(out, 'tiles', `${o.id}.png`)).href;
      return `<figure><img src="${path}"><figcaption>${o.letter}</figcaption></figure>`;
    })
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font-family:Georgia,serif}
    .grid{display:grid;grid-template-columns:repeat(3,1fr)}
    figure{margin:0;position:relative;aspect-ratio:3/2;overflow:hidden}
    img{width:100%;height:100%;object-fit:cover;object-position:50% 22%}
    figcaption{position:absolute;left:14px;top:8px;font-size:60px;color:#111;
      background:rgba(255,255,255,.88);padding:0 14px;line-height:1.1;font-weight:700}
  </style><div class="grid">${tilesHtml}</div>`;
  await writeFile(resolve(out, 'sheet.html'), html, 'utf8');
  const sheetBrowser = await chromium.launch({ executablePath: CHROME });
  const sheetPage = await sheetBrowser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1.5 });
  await sheetPage.goto(pathToFileURL(resolve(out, 'sheet.html')).href);
  await sheetPage.waitForTimeout(800);
  await sheetPage.screenshot({ path: resolve(out, 'sheet.png'), fullPage: true });
  await sheetBrowser.close();

  process.stdout.write(`\n${order.length} 张，对照表在 proof/gate-d/pack.md\n`);
}

await main();
