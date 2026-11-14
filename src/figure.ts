/**
 * 虚拟人「和」：武当山门下的少年道童。
 *
 * 不画五官，只画一身道袍的剪影——一是不抢山的戏，二是缩到 130 像素还立得住。
 * 十三势的差别全在肩、肘、袖口拖出来的那几根线上。
 *
 * 铜版里她有一道极细的暖金边：不是描边，是光从背后擦过剪影的边缘。
 */

import type { Pose } from './postures';

const HEAD_R = 5.6;
const SHOULDER_Y = 15.6;
const SHOULDER_HALF = 10.4;
const WAIST_Y = 40;
const HIP_Y = 44;
const UPPER_ARM = 14.6;
const FOREARM = 13.2;

export interface FigureColors {
  ink: string;
  /** 背后擦过的那道边；null 表示不画 */
  edge: string | null;
}

type Pt = [number, number];

export function drawFigure(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  x: number,
  groundY: number,
  height: number,
  colors: FigureColors,
): void {
  const s = height / 100;

  if (colors.edge) {
    // 第一遍：稍大一圈、只填边的颜色。第二遍盖上去，露出来的就是一道边光。
    ctx.save();
    ctx.translate(x, groundY - height * 0.972);
    ctx.scale(s * 1.028, s * 1.02);
    paint(ctx, pose, colors.edge);
    ctx.restore();
  }

  ctx.save();
  // 坐标是「头顶为 0、脚底为 97」，所以要把 groundY 换算回头顶
  ctx.translate(x, groundY - height * 0.972);
  ctx.scale(s, s);
  paint(ctx, pose, colors.ink);
  ctx.restore();
}

/** 在「头顶 0、脚底 97」的局部坐标里把整个人画出来。 */
function paint(ctx: CanvasRenderingContext2D, pose: Pose, fill: string): void {
  const sink = pose.sink * 5.2;
  const lean = (pose.lean * Math.PI) / 180;
  const hip: Pt = [0, HIP_Y + sink];
  const spin = (p: Pt): Pt => [
    hip[0] + (p[0] - hip[0]) * Math.cos(lean) - (p[1] - hip[1]) * Math.sin(lean),
    hip[1] + (p[0] - hip[0]) * Math.sin(lean) + (p[1] - hip[1]) * Math.cos(lean),
  ];

  const neck = spin([0, SHOULDER_Y - 3.4]);
  const head: Pt = [neck[0] + Math.sin(lean) * 8.6 + pose.head * 0.05, neck[1] - Math.cos(lean) * 8.6];
  const shoulderL = spin([-SHOULDER_HALF, SHOULDER_Y]);
  const shoulderR = spin([SHOULDER_HALF, SHOULDER_Y]);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;

  const footHalf = 5.2 * pose.stance + sink * 0.7;

  // 腿：只露小腿以下
  for (const side of [-1, 1] as const) {
    const top: Pt = spin([side * 3.6, HIP_Y + 2]);
    const knee: Pt = [side * (3.4 + pose.stance * 1.2), 70 + sink];
    const foot: Pt = [side * footHalf, 96.5];
    tapered(ctx, [top, knee, foot], [5.6, 3.4, 2.2]);
    ctx.beginPath();
    ctx.ellipse(foot[0] + side * 1.4, 97.2, 4.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 道袍
  const hemY = 84 + sink * 0.8;
  const hemHalf = 18 + pose.stance * 3.6 + pose.sink * 2.4;
  const waistL = spin([-7.4, WAIST_Y]);
  const waistR = spin([7.4, WAIST_Y]);
  ctx.beginPath();
  ctx.moveTo(shoulderL[0], shoulderL[1] - 1);
  ctx.quadraticCurveTo(waistL[0] - 1.2, waistL[1] - 6, waistL[0], waistL[1]);
  ctx.quadraticCurveTo(waistL[0] - hemHalf * 0.5, (waistL[1] + hemY) / 2, hip[0] - hemHalf, hemY);
  ctx.quadraticCurveTo(hip[0] - hemHalf * 0.4, hemY + 4.6, hip[0], hemY + 2.4);
  ctx.quadraticCurveTo(hip[0] + hemHalf * 0.4, hemY + 4.6, hip[0] + hemHalf, hemY);
  ctx.quadraticCurveTo(waistR[0] + hemHalf * 0.5, (waistR[1] + hemY) / 2, waistR[0], waistR[1]);
  ctx.quadraticCurveTo(waistR[0] + 1.2, waistR[1] - 6, shoulderR[0], shoulderR[1] - 1);
  ctx.quadraticCurveTo(hip[0], SHOULDER_Y + 1.6, shoulderL[0], shoulderL[1] - 1);
  ctx.closePath();
  ctx.fill();

  // 腰带与领口：两处留白，剪影才不糊成一团
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(waistL[0] - 0.6, waistL[1] - 2.6);
  ctx.quadraticCurveTo(hip[0], waistL[1] - 0.4, waistR[0] + 0.6, waistR[1] - 2.6);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(neck[0] - 4.4, SHOULDER_Y - 1.4);
  ctx.lineTo(neck[0], SHOULDER_Y + 4.2);
  ctx.lineTo(neck[0] + 4.4, SHOULDER_Y - 1.4);
  ctx.lineWidth = 1.9;
  ctx.stroke();
  ctx.restore();

  // 颈
  tapered(ctx, [neck, [neck[0], SHOULDER_Y + 1.4]], [3.4, 4.2]);

  // 袖子 + 手臂
  arm(ctx, shoulderL, pose.armL);
  arm(ctx, shoulderR, pose.armR);

  // 头、发髻
  ctx.beginPath();
  ctx.arc(head[0], head[1], HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(head[0] + Math.sin(lean) * 2.6, head[1] - HEAD_R - 1.5, 3.2, 2.4, pose.head * 0.012, 0, Math.PI * 2);
  ctx.fill();
  // 鬓角一缕，风一吹才不呆
  ctx.beginPath();
  ctx.moveTo(head[0] - HEAD_R * 0.88, head[1] + 0.6);
  ctx.quadraticCurveTo(head[0] - HEAD_R * 1.55, head[1] + 4.6, head[0] - HEAD_R * 1.05, head[1] + 8.2);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function arm(ctx: CanvasRenderingContext2D, shoulder: Pt, angles: [number, number]): void {
  const a0 = (angles[0] * Math.PI) / 180;
  const a1 = (angles[1] * Math.PI) / 180;
  const elbow: Pt = [shoulder[0] + Math.sin(a0) * UPPER_ARM, shoulder[1] + Math.cos(a0) * UPPER_ARM];
  const wrist: Pt = [elbow[0] + Math.sin(a1) * FOREARM, elbow[1] + Math.cos(a1) * FOREARM];
  const hand: Pt = [wrist[0] + Math.sin(a1) * 3.6, wrist[1] + Math.cos(a1) * 3.6];
  const cuff: Pt = [wrist[0] - Math.sin(a1) * 1.6, wrist[1] - Math.cos(a1) * 1.6];

  // 广袖：肩窄、肘松、袖口张开又收住
  tapered(ctx, [shoulder, elbow, cuff], [6.6, 9.4, 11.6]);
  tapered(ctx, [wrist, hand], [3.2, 1.5]);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cuff[0], cuff[1], 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 一条两头不一样粗的线，用多边形填出来，比 lineWidth 更像毛笔。 */
function tapered(ctx: CanvasRenderingContext2D, pts: Pt[], widths: number[]): void {
  if (pts.length < 2) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    if (!p || !prev || !next) continue;
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (widths[i] ?? widths[widths.length - 1] ?? 2) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  if (left.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(left[0]?.[0] ?? 0, left[0]?.[1] ?? 0);
  for (let i = 1; i < left.length; i += 1) {
    const p = left[i];
    if (p) ctx.lineTo(p[0], p[1]);
  }
  for (let i = right.length - 1; i >= 0; i -= 1) {
    const p = right[i];
    if (p) ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fill();
}
