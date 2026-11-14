/**
 * 山。不是照片，是一张版画：几层干净的剪影叠出远近，边线是唯一要画准的东西。
 *
 * 整幅景一次性画进离屏底图，每帧只做位移与云。所有随机都来自固定种子：
 * 换一台机器，还是同一座山。
 *
 * 材质由 Theme 决定：纸墨（paper）或暗铜鎏金（bronze）。同一座山，两种物。
 */

import { mulberry32, range } from './rng';
import type { Theme } from './theme';

const SAMPLES = 321;
const SEED = 0x5a17c0de;

interface Range {
  baseY: number;
  height: number;
  alpha: number;
  profile: Float32Array;
}

interface Wisp {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
  drift: number;
  lift: number;
}

export interface Frame {
  t: number;
  breath: number;
  index: number;
  committed: boolean;
}

export class Scene {
  #w = 0;
  #h = 0;
  #ranges: Range[] = [];
  #wisps: Wisp[] = [];
  #base: HTMLCanvasElement | null = null;
  #summit = { x: 0, y: 0 };
  #theme: Theme;

  constructor(theme: Theme) {
    this.#theme = theme;
  }

  resize(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (w === this.#w && h === this.#h) return;
    this.#w = w;
    this.#h = h;

    const rng = mulberry32(SEED);
    this.#ranges = [
      makeRange(rng, 0.6, 0.115, 0.1, 9, 0.12, 0.38, 0.5, 0.1),
      makeRange(rng, 0.68, 0.15, 0.13, 7, 0.14, 0.46, 0.5, 0.22),
      makeRange(rng, 0.775, 0.2, 0.15, 6, 0.16, 0.52, 0.5, 0.34),
    ];
    this.#summit = { x: w * 0.5, y: h * 0.6 };

    const wispRng = mulberry32(SEED ^ 0x9e37);
    this.#wisps = Array.from({ length: 10 }, () => ({
      x: range(wispRng, -0.1, 1.1),
      y: range(wispRng, 0.56, 0.8),
      rx: range(wispRng, 0.1, 0.22),
      ry: range(wispRng, 0.008, 0.02),
      alpha: range(wispRng, 0.12, 0.3),
      drift: range(wispRng, 0.004, 0.012) * (wispRng() > 0.5 ? 1 : -1),
      lift: range(wispRng, 0.4, 1),
    }));

    this.#base = this.#paintBase(ctx, w, h);
  }

  get summit(): { x: number; y: number } {
    return this.#summit;
  }

  get w(): number {
    return this.#w;
  }

  get h(): number {
    return this.#h;
  }

  draw(ctx: CanvasRenderingContext2D, frame: Frame): void {
    const { w, h } = this;
    const base = this.#base;
    if (!base) return;
    ctx.clearRect(0, 0, w, h);
    const lift = -h * 0.004 * ease(frame.breath);
    ctx.drawImage(base, 0, lift, w, h);

    // 吸气把铜面擦亮一点。只有 3%，但铜是会被擦亮的，这不是特效，是材质。
    if (this.#theme.id === 'bronze') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(226,186,116,${0.03 * ease(frame.breath)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    this.#clouds(ctx, frame);
  }

  #paintBase(ctx: CanvasRenderingContext2D, w: number, h: number): HTMLCanvasElement {
    const off = document.createElement('canvas');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    off.width = Math.round(w * dpr);
    off.height = Math.round(h * dpr);
    const c = off.getContext('2d');
    if (!c) return off;
    c.scale(dpr, dpr);

    this.#ground(c, w, h);
    for (let i = 0; i < this.#ranges.length; i += 1) {
      this.#range(c, i, w, h);
      if (this.#theme.id === 'paper') {
        if (i === 1) this.#mist(c, w, h, 0.655, 0.08, 0.55);
        if (i === 2) this.#mist(c, w, h, 0.772, 0.075, 0.42);
      }
    }
    this.#hall(c, w, h);
    this.#ledge(c, w, h);
    this.#birds(c, w, h);
    this.#grain(c, w, h, ctx);
    return off;
  }

  /** 底：纸，或者氧化的铜面。 */
  #ground(c: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.#theme;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, t.base[0]);
    g.addColorStop(0.45, t.base[1]);
    g.addColorStop(1, t.base[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    if (t.id === 'bronze') {
      // 夜铜：只在山脊那一线有一点暖光，其余压到近黑
      // 只在金顶背后留一点光，不做横向的暖带——横带一出现，山就又像沙丘了
      const behind = c.createRadialGradient(w * 0.5, h * 0.58, 0, w * 0.5, h * 0.58, h * 0.42);
      behind.addColorStop(0, 'rgba(120,88,44,0.22)');
      behind.addColorStop(0.45, 'rgba(96,70,34,0.07)');
      behind.addColorStop(1, 'rgba(96,70,34,0)');
      c.fillStyle = behind;
      c.fillRect(0, 0, w, h);
      // 四角压暗，铜器才有厚度
      const vig = c.createRadialGradient(w * 0.5, h * 0.55, h * 0.14, w * 0.5, h * 0.55, h * 0.95);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.6, 'rgba(0,0,0,0.24)');
      vig.addColorStop(1, 'rgba(0,0,0,0.66)');
      c.fillStyle = vig;
      c.fillRect(0, 0, w, h);
    }

    // 金顶上方那抹光
    const sky = c.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, h * 0.5);
    sky.addColorStop(0, `rgba(${t.glow},${t.id === 'bronze' ? 0.16 : 0.1})`);
    sky.addColorStop(0.6, `rgba(${t.glow},${t.id === 'bronze' ? 0.05 : 0.03})`);
    sky.addColorStop(1, `rgba(${t.glow},0)`);
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
  }

  #range(c: CanvasRenderingContext2D, layer: number, w: number, h: number): void {
    const r = this.#ranges[layer];
    if (!r) return;
    const t = this.#theme;
    const pts: [number, number][] = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      const u = i / (SAMPLES - 1);
      pts.push([-w * 0.04 + u * w * 1.08, h * (r.baseY - r.profile[i]! * r.height)]);
    }

    c.save();
    c.beginPath();
    c.moveTo(pts[0]?.[0] ?? 0, h + 10);
    for (const p of pts) c.lineTo(p[0], p[1]);
    c.lineTo(pts[pts.length - 1]?.[0] ?? w, h + 10);
    c.closePath();
    c.fillStyle = `rgba(${t.range},${r.alpha})`;
    c.fill();

    if (t.id === 'bronze') {
      // 受光的只有边。而且不是均匀的一条线：陡处亮、缓处断，越远越弱。
      // 均匀的细线会读成等高线（另一种套路），断断续续才像反光。
      const base = [0.1, 0.2, 0.34][layer] ?? 0.2;
      let maxDy = 0;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        maxDy = Math.max(maxDy, Math.abs(b[1] - a[1]));
      }
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dy = Math.abs(b[1] - a[1]) / (maxDy || 1);
        // 只有陡坡受光；再乘一个横向的位置权重，山顶附近最亮
        const cx = (a[0] + b[0]) / 2 / w;
        const around = 1 - Math.min(1, Math.abs(cx - 0.5) / 0.42) ** 1.6;
        const alpha = base * (0.06 + 0.94 * dy ** 1.5) * (0.25 + 0.75 * around);
        if (alpha < 0.01) continue;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.strokeStyle = `rgba(${t.ridge},${alpha})`;
        c.stroke();
      }
    }

    // 山脚化开：纸上用擦，铜上用底色盖（深底上擦不干净）
    const top = Math.min(...pts.map((p) => p[1]));
    if (t.fadeMode === 'erase') {
      c.globalCompositeOperation = 'destination-out';
      const fade = c.createLinearGradient(0, top, 0, h * (r.baseY + 0.02));
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(0.55, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = fade;
      c.fillRect(0, top, w, h);
    } else {
      const fade = c.createLinearGradient(0, h * (r.baseY - 0.06), 0, h * (r.baseY + 0.1));
      fade.addColorStop(0, 'rgba(10,8,6,0)');
      fade.addColorStop(0.5, 'rgba(10,8,6,0.62)');
      fade.addColorStop(1, t.fade);
      c.fillStyle = fade;
      // 一直铺到画布底：只铺一段会留下一条横向硬边
      c.fillRect(0, h * (r.baseY - 0.06), w, h * 2);
    }
    c.restore();
  }

  #mist(c: CanvasRenderingContext2D, w: number, h: number, at: number, height: number, alpha: number): void {
    const t = this.#theme;
    const rgb = t.id === 'bronze' ? '226,190,132' : '247,242,232';
    const a = t.id === 'bronze' ? alpha * 0.55 : alpha;
    const g = c.createLinearGradient(0, h * at, 0, h * (at + height));
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(0.45, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, h * at, w, h * height);
  }

  #hall(c: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.#theme;
    const x = w * 0.335;
    const y = this.#ridgeY(1, 0.335) + h * 0.004;
    const s = Math.max(0.55, Math.min(1.15, h / 1300));
    c.save();
    const hallInk = t.id === 'bronze' ? `rgba(${t.ridge},0.62)` : `rgba(${t.hall},0.55)`;
    c.fillStyle = hallInk;
    c.strokeStyle = hallInk;
    c.lineWidth = 1.1 * s;
    c.fillRect(x - 24 * s, y - 3.5 * s, 48 * s, 3.5 * s);
    c.fillRect(x - 15 * s, y - 16 * s, 30 * s, 13 * s);
    for (let i = 0; i < 2; i += 1) {
      const roofY = y - 16 * s - i * 7.4 * s;
      const halfW = (23 - i * 6) * s;
      c.beginPath();
      c.moveTo(x - halfW, roofY);
      c.quadraticCurveTo(x, roofY - 9 * s, x + halfW, roofY);
      c.quadraticCurveTo(x, roofY - 3.6 * s, x - halfW, roofY);
      c.fill();
    }
    c.beginPath();
    c.moveTo(x, y - 31 * s);
    c.lineTo(x, y - 24 * s);
    c.stroke();
    c.restore();
  }

  /** 某一层山在 u 处的屏幕高度。 */
  #ridgeY(layer: number, u: number): number {
    const r = this.#ranges[layer];
    if (!r) return this.#h;
    const pos = Math.min(SAMPLES - 1, Math.max(0, u * (SAMPLES - 1)));
    const i = Math.floor(pos);
    const f = pos - i;
    const a = r.profile[i] ?? 0;
    const b = r.profile[i + 1] ?? a;
    return this.#h * (r.baseY - (a + (b - a) * f) * r.height);
  }

  /**
   * 金顶：脚下那一小块岩。
   *
   * 只画人站得住的那一点。山有多高，交给雾、交给题字、交给看画的人自己补。
   */
  #ledge(c: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.#theme;
    const ax = w * 0.5;
    const ay = h * 0.6;
    const half = w * 0.046;
    const dark = t.id === 'bronze' ? '6,5,3' : '20,18,15';

    c.save();
    c.beginPath();
    c.moveTo(ax - half, ay);
    c.quadraticCurveTo(ax - half * 0.55, ay - h * 0.003, ax - half * 0.2, ay - h * 0.004);
    c.quadraticCurveTo(ax + half * 0.3, ay - h * 0.005, ax + half * 0.86, ay + h * 0.002);
    c.quadraticCurveTo(ax + half * 0.5, ay + h * 0.014, ax + half * 0.18, ay + h * 0.02);
    c.quadraticCurveTo(ax - half * 0.4, ay + h * 0.026, ax - half, ay);
    c.closePath();
    const g = c.createLinearGradient(0, ay - h * 0.006, 0, ay + h * 0.028);
    g.addColorStop(0, `rgba(${dark},0.74)`);
    g.addColorStop(0.5, `rgba(${dark},0.26)`);
    g.addColorStop(1, `rgba(${dark},0)`);
    c.fillStyle = g;
    c.fill();

    // 顶面那一笔：铜版上这是被磨亮的边，所以用暖金而不是黑
    c.beginPath();
    c.moveTo(ax - half, ay);
    c.quadraticCurveTo(ax - half * 0.4, ay - h * 0.007, ax + half * 0.86, ay + h * 0.002);
    c.strokeStyle = t.id === 'bronze' ? `rgba(${t.ridge},0.5)` : 'rgba(18,16,13,0.66)';
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    c.stroke();

    const rng = mulberry32(SEED ^ 0x4c1);
    for (let i = 0; i < 16; i += 1) {
      const px = ax + (rng() - 0.5) * w * 0.12;
      const py = ay + h * (0.004 + rng() * 0.026);
      c.beginPath();
      c.ellipse(px, py, w * (0.0005 + rng() * 0.0012), h * (0.0006 + rng() * 0.0013), 0, 0, Math.PI * 2);
      c.fillStyle = `rgba(${dark},${0.04 + rng() * 0.12})`;
      c.fill();
    }
    c.restore();
  }

  /** 几只鸟。天空空得太干净时，一点活气就够了。 */
  #birds(c: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.#theme;
    const rng = mulberry32(SEED ^ 0xb1d);
    c.save();
    c.strokeStyle = t.id === 'bronze' ? 'rgba(226,190,132,0.42)' : 'rgba(24,21,18,0.4)';
    c.lineCap = 'round';
    for (let i = 0; i < 5; i += 1) {
      const x = w * (0.15 + rng() * 0.2);
      const y = h * (0.19 + rng() * 0.15);
      const s = w * (0.006 + rng() * 0.004);
      c.beginPath();
      c.moveTo(x - s, y);
      c.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y - s * 0.1);
      c.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
      c.lineWidth = Math.max(0.9, w * 0.0016);
      c.stroke();
    }
    c.restore();
  }

  #grain(c: CanvasRenderingContext2D, w: number, h: number, target: CanvasRenderingContext2D): void {
    const size = 128;
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const octx = tile.getContext('2d');
    if (!octx) return;
    const image = octx.createImageData(size, size);
    const rng = mulberry32(0xbeef);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 128 + Math.round((rng() - 0.5) * 70);
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    octx.putImageData(image, 0, 0);
    const pattern = target.createPattern(tile, 'repeat');
    if (!pattern) return;
    c.save();
    c.globalAlpha = this.#theme.grain;
    c.fillStyle = pattern;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  #clouds(ctx: CanvasRenderingContext2D, frame: Frame): void {
    const { w, h } = this;
    const e = ease(frame.breath);
    const rgb = this.#theme.cloud;
    ctx.save();
    for (const c of this.#wisps) {
      const x = (((c.x + frame.t * c.drift) % 1.3) + 1.3) % 1.3;
      const px = (x - 0.15) * w;
      const py = c.y * h - e * h * 0.06 * c.lift;
      const g = ctx.createRadialGradient(px, py, 0, px, py, Math.max(1, c.rx * w));
      const a = c.alpha * (0.7 + 0.45 * e) * (this.#theme.id === 'bronze' ? 0.55 : 1);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(0.55, `rgba(${rgb},${a * 0.4})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, Math.max(1, c.rx * w), Math.max(1, c.ry * h), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function makeRange(
  rng: () => number,
  baseY: number,
  height: number,
  alpha: number,
  count: number,
  minW: number,
  maxW: number,
  summitX: number,
  summitWeight: number,
): Range {
  const bumps: { c: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const c = (i + 0.5) / count + range(rng, -0.07, 0.07);
    const w = range(rng, minW, maxW);
    const distToSummit = Math.abs(c - summitX);
    const boost = summitWeight * Math.max(0, 1 - distToSummit / 0.44) ** 2;
    bumps.push({ c, w, h: range(rng, 0.45, 1) * 0.58 + boost });
  }

  const raw = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i += 1) {
    const u = i / (SAMPLES - 1);
    let v = 0.05;
    for (const b of bumps) {
      const d = Math.abs(u - b.c) / b.w;
      // 1.45 次方：山尖是尖的，不是圆包
      if (d < 1) v += b.h * Math.pow(1 - d, 1.45);
    }
    raw[i] = v;
  }
  let max = 0;
  for (const v of raw) max = Math.max(max, v);
  const profile = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i += 1) profile[i] = (raw[i] ?? 0) / (max || 1);

  return { baseY, height, alpha, profile };
}

function ease(x: number): number {
  const t = Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
