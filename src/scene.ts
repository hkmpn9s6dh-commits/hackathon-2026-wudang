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

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
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
    // 远山只留两层极淡的，给纵深，不抢近峰
    for (let i = 0; i < this.#ranges.length; i += 1) this.#range(c, i, w, h);
    this.#massif(c, w, h);
    this.#hall(c, w, h);
    this.#ledge(c, w, h);
    this.#birds(c, w, h);
    const scrim = c.createLinearGradient(0, h * 0.74, 0, h);
    scrim.addColorStop(0, 'rgba(246,241,231,0)');
    scrim.addColorStop(0.6, 'rgba(246,241,231,0.5)');
    scrim.addColorStop(1, 'rgba(246,241,231,0.86)');
    c.fillStyle = scrim;
    c.fillRect(0, h * 0.74, w, h * 0.26);
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

    if (t.render === 'flat') {
      // 绢纹：横向的细丝。一条一条画，密度不均，是织出来的，不是贴图
      const silkRng = mulberry32(SEED ^ 0x51c0);
      c.save();
      for (let y = 0; y < h; y += 1) {
        const a = t.silk * (0.35 + silkRng() * 0.9);
        c.fillStyle = `rgba(120,104,76,${a * 0.12})`;
        c.fillRect(0, y, w, 1);
      }
      c.restore();
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
    if (t.render === 'flat' && t.id !== 'bronze') {
      // 青绿是平涂：一块石青、一块石绿、一块赭石，各自干净，不晕
      const color = t.rangeColors?.[layer] ?? t.range;
      const solid = [0.52, 0.6, 0.68][layer] ?? 0.5;
      c.fillStyle = `rgba(${color},${solid})`;
      c.fill();

      // 山脚淡下去：矿物色越远越薄，不是擦掉
      c.save();
      c.clip();
      const foot = c.createLinearGradient(0, h * (r.baseY - 0.02), 0, h * (r.baseY + 0.18));
      foot.addColorStop(0, `rgba(${hexToRgb(t.fade)},0)`);
      foot.addColorStop(0.5, `rgba(${hexToRgb(t.fade)},0.5)`);
      foot.addColorStop(1, `rgba(${hexToRgb(t.fade)},0.97)`);
      c.fillStyle = foot;
      c.fillRect(0, h * (r.baseY - 0.02), w, h * 0.22);
      c.restore();

      // 勾线：赭墨沿脊走一道。青绿靠这条线立骨
      c.beginPath();
      pts.forEach((pp, i) => {
        if (i === 0) c.moveTo(pp[0], pp[1]);
        else c.lineTo(pp[0], pp[1]);
      });
      c.strokeStyle = `rgba(${t.contour},${0.3 + layer * 0.09})`;
      c.lineWidth = layer === 2 ? 1.6 : 1.05;
      c.lineJoin = 'round';
      c.stroke();
      c.restore();
      return;
    }

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
      // 最后必须擦到 1：只擦掉一半会在山脚留下一条横线
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(0.35, 'rgba(0,0,0,0)');
      fade.addColorStop(0.75, 'rgba(0,0,0,0.7)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
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

  /**
   * 近山。坐标是手写的，不是随机生成的。
   *
   * 这是整个作品里唯一一处「被安排过」的形状：左肩、主峰、右侧断崖、下坡、山脚。
   * 随机生成的圆包只能画丘陵；有峰有崖，才有人会在上面站。
   */
  #massif(c: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.#theme;
    const ink = t.id === 'bronze' ? '226,186,116' : t.range;
    const P = (x: number, y: number): [number, number] => [x * w, y * h];

    // 一座孤峰：两侧都落到云里，不在画面里连成一条山脉。
    // 峰尖要尖（0.5, 0.6），右肩陡、左肩缓——对称的锥是最不像山的东西。
    const outline: [number, number][] = [
      P(0.196, 0.952),
      P(0.238, 0.9),
      P(0.268, 0.868),
      P(0.292, 0.879),
      P(0.316, 0.842),
      P(0.344, 0.856),
      P(0.372, 0.806),
      P(0.404, 0.796),
      P(0.428, 0.752),
      P(0.452, 0.706),
      P(0.474, 0.652),
      P(0.5, 0.602),
      P(0.518, 0.638),
      P(0.532, 0.7),
      P(0.556, 0.756),
      P(0.604, 0.784),
      P(0.66, 0.832),
      P(0.73, 0.884),
      P(0.806, 0.952),
    ];

    const path = (): void => {
      c.beginPath();
      const first = outline[0]!;
      c.moveTo(first[0], first[1]);
      for (let i = 1; i < outline.length; i += 1) {
        const a = outline[i - 1]!;
        const b = outline[i]!;
        c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, b[0], b[1]);
      }
      c.lineTo(w * 0.802, h * 1.06);
      c.lineTo(w * 0.2, h * 1.06);
      c.closePath();
    };

    c.save();
    path();
    const g = c.createLinearGradient(0, h * 0.58, 0, h * 1.0);
    g.addColorStop(0, `rgba(${ink},${t.id === 'bronze' ? 0.12 : 0.4})`);
    g.addColorStop(0.3, `rgba(${ink},${t.id === 'bronze' ? 0.06 : 0.22})`);
    g.addColorStop(0.72, `rgba(${ink},${t.id === 'bronze' ? 0.02 : 0.08})`);
    g.addColorStop(1, `rgba(${ink},${t.id === 'bronze' ? 0 : 0.01})`);
    c.fillStyle = g;
    c.fill();

    // 8 bit 渐变会出横条带；用一层细噪点压掉，顺便当纸的颗粒
    c.save();
    c.clip();
    const bandRng = mulberry32(SEED ^ 0x2b17);
    for (let i = 0; i < 2600; i += 1) {
      const px = bandRng() * w;
      const py = h * (0.58 + bandRng() * 0.46);
      c.fillStyle = `rgba(${ink},${bandRng() * 0.05})`;
      c.fillRect(px, py, 1.4, 1.4);
    }
    c.restore();

    // 左侧受光面：光从左上来，坡才不是一块平涂
    c.save();
    c.clip();
    const lit = c.createLinearGradient(w * 0.1, h * 0.62, w * 0.46, h * 0.86);
    lit.addColorStop(0, `rgba(${t.glow},${t.id === 'bronze' ? 0.03 : 0.22})`);
    lit.addColorStop(1, `rgba(${t.glow},0)`);
    c.fillStyle = lit;
    c.fillRect(0, h * 0.55, w, h * 0.5);
    c.restore();

    // 山体里压几团墨：一块平三角是图标，有浓淡才是山
    const massRng = mulberry32(SEED ^ 0x6d21);
    for (let i = 0; i < 7; i += 1) {
      const t0 = massRng();
      const cx = w * (0.28 + massRng() * 0.44);
      const cy = h * (0.68 + t0 * 0.22);
      const rr = w * (0.05 + massRng() * 0.13);
      const wg = c.createRadialGradient(cx, cy, 0, cx, cy, rr);
      wg.addColorStop(0, `rgba(${ink},${0.06 + massRng() * 0.1})`);
      wg.addColorStop(1, `rgba(${ink},0)`);
      c.save();
      c.clip();
      c.fillStyle = wg;
      c.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      c.restore();
    }

    // 背光面：峰右一侧压一道，山才有体积
    c.save();
    c.clip();
    const shade = c.createLinearGradient(w * 0.52, h * 0.6, w * 0.74, h * 0.9);
    shade.addColorStop(0, `rgba(${ink},${t.id === 'bronze' ? 0.04 : 0.16})`);
    shade.addColorStop(1, `rgba(${ink},0)`);
    c.fillStyle = shade;
    c.fillRect(w * 0.45, h * 0.55, w * 0.4, h * 0.5);
    c.restore();

    // 脊线：只描山腰以上，两端渐隐
    for (let i = 3; i < outline.length - 3; i += 1) {
      const a = outline[i - 1]!;
      const b = outline[i]!;
      const edge = Math.min(i - 3, outline.length - 3 - i) / 6;
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.strokeStyle = `rgba(${ink},${(t.id === 'bronze' ? 0.5 : 0.42) * Math.min(1, 0.2 + edge)})`;
      c.lineWidth = 1.3;
      c.lineCap = 'round';
      c.stroke();
    }

    // 松：三四株，只到膝盖高。给人一个尺度，山才有那么大
    const tree = (x: number, y: number, s: number): void => {
      c.fillStyle = `rgba(${ink},0.5)`;
      c.strokeStyle = `rgba(${ink},0.5)`;
      c.lineWidth = Math.max(0.9, s * 0.12);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - s * 0.5);
      c.stroke();
      // 针叶：三层小三角，一层比一层窄
      for (let k = 0; k < 3; k += 1) {
        const top = y - s * (0.38 + k * 0.22);
        const half = s * (0.34 - k * 0.075);
        c.beginPath();
        c.moveTo(x, top - s * 0.3);
        c.lineTo(x + half, top);
        c.lineTo(x - half, top);
        c.closePath();
        c.fill();
      }
    };
    tree(w * 0.39, h * 0.79, h * 0.026);
    tree(w * 0.412, h * 0.776, h * 0.019);
    tree(w * 0.588, h * 0.782, h * 0.022);
    tree(w * 0.61, h * 0.797, h * 0.016);
    c.restore();
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
    c.globalAlpha = this.#theme.grain * 1.4;
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
