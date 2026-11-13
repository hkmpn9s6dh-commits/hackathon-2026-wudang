# 朝元 · 一口炁，上金顶

武当数字文创互动作品 · 虚拟人「和」

按住屏幕吸气，云从七十二峰倒流上金顶；松手呼气，太极十三势一式落地。
十三口气走完，收在一句「一炁朝元」。

- 线上：https://hkmpn9s6dh-commits.github.io/hackathon-2026-wudang/
- 参赛：2026「数字武当杯」AI 创新大赛 · 赛道四 数字文创（征稿至 2026-12-10）

## 它是什么

一个竖屏网页作品，给景区竖屏装置和手机扫码用。它不解释武当，只让人**跟着呼吸走完一遍太极十三势**：
每一口气对应一势，势名、行功心解、白话、王宗岳《十三势歌》各一句，四层字，由大到小。

不需要账号、不联网、不调外部模型。全部图形是 Canvas 代码画出来的，山脉与云由固定种子决定，
所以任何一台机器上看到的都是同一座山。

## 怎么跑

```bash
npm ci
npm run build      # 产物在 dist/，约 110 KB
npm run verify     # 一条命令：类型检查 → 单测 → 构建 → 真浏览器 e2e → 界面量测 → 卫生检查
```

单跑某一环：

```bash
npm run typecheck
npm test           # 34 条纯逻辑单测（呼吸状态机 / 十三势 / 文案 / 种子随机）
npm run e2e        # 23 项真浏览器检查
npm run measure    # 字号、压字、越界；写 proof/ui/report.md
npm run shot       # 实拍 6 张，落在 shots/
```

线上复验同一套 e2e：

```bash
CHAOYUAN_URL=https://hkmpn9s6dh-commits.github.io/hackathon-2026-wudang/ npm run e2e
```

## 目录

```
index.html            一页
src/postures.ts       十三势：势名、心解、白话、歌诀、姿态参数
src/state.ts          呼吸状态机（纯逻辑，时间由外面给）
src/labels.ts         画面上每一处文案怎么变
src/scene.ts          纸、三层远山、金顶、云、殿、飞鸟
src/figure.ts         虚拟人「和」：道袍剪影 + 十三势姿态
src/main.ts           输入、渲染循环、DOM 文案
test/                 单测
scripts/              verify / e2e / measure-ui / shot / serve / 字体子集
docs/                 规格、界面、虚拟人设定、提交文案、复盘
proof/                量测报告与实拍
```

## 字体

界面带的是 Noto Serif SC 的子集（`src/assets/chaoyuan-serif.woff2`，88 KB，OFL），
只保留作品实际用到的 567 个字符。不依赖系统里装没装思源宋体——评委那台机器上也是这个样子。
改文案之后要重跑 `python scripts/subset-fonts.py`。

## 许可

代码 MIT。字体 SIL Open Font License 1.1（随包，见 `src/assets/OFL.txt`）。
引用的《十三势歌》《太极拳论》为王宗岳旧文，公有领域。
