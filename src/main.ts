import './styles.css';

import { drawFigure } from './figure';
import { countLabel, hintFor, shownIndex } from './labels';
import { POSTURES, WUJI, blendPose, type Pose } from './postures';
import { Scene, type Frame } from './scene';
import { Breath } from './state';

const stage = requireEl<HTMLElement>('#stage');
const canvas = requireEl<HTMLCanvasElement>('#scene');
const postureEl = requireEl<HTMLElement>('#posture');
const glossEl = requireEl<HTMLElement>('#gloss');
const verseEl = requireEl<HTMLElement>('#verse');
const countEl = requireEl<HTMLElement>('#count');
const hintEl = requireEl<HTMLElement>('#hint');
const ticksEl = requireEl<HTMLElement>('#ticks');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

for (let i = 0; i < POSTURES.length; i += 1) {
  const li = document.createElement('li');
  ticksEl.append(li);
}
const ticks = Array.from(ticksEl.children) as HTMLElement[];

const maybeCtx = canvas.getContext('2d');
if (!maybeCtx) throw new Error('canvas 2d 上下文拿不到');
const ctx: CanvasRenderingContext2D = maybeCtx;

const scene = new Scene();
const breath = new Breath();

let lastIndex = -1;
let lastPhase = '';

function resize(): void {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scene.resize(ctx, w, h);
}

window.addEventListener('resize', resize);
resize();

// ---- 输入 ----------------------------------------------------------------

let pressed = false;

function press(): void {
  if (breath.phase === 'done') {
    breath.reset();
    lastIndex = -1;
    syncText(performance.now());
  }
  if (!breath.press(performance.now())) return;
  pressed = true;
  stage.dataset.phase = breath.phase;
  syncText(performance.now());
}

function release(): void {
  if (!pressed) return;
  pressed = false;
  if (!breath.release(performance.now())) return;
  stage.dataset.phase = breath.phase;
  syncText(performance.now());
}

stage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  event.preventDefault();
  press();
});

window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('blur', release);

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code !== 'Space' && event.code !== 'Enter') return;
  event.preventDefault();
  press();
});

window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') return;
  event.preventDefault();
  release();
});

document.addEventListener('contextmenu', (event) => event.preventDefault());

// ---- 画面 ----------------------------------------------------------------

function poseNow(): Pose {
  const index = breath.index;
  const target = POSTURES[Math.min(index, POSTURES.length - 1)];
  if (!target) return WUJI;
  if (breath.phase === 'done') return target.pose;
  const from = index > 0 ? (POSTURES[index - 1] ?? WUJI).pose : WUJI;
  if (breath.phase === 'idle') return from;
  const b = breath.breath;
  let t: number;
  if (breath.phase === 'exhale') {
    t = breath.committed ? 0.62 + 0.38 * ease(1 - b) : 0.62 * (1 - ease(b));
  } else {
    t = 0.62 * ease(b);
  }
  return blendPose(from, target.pose, clamp01(t));
}

function drawRing(now: number, centerX: number, centerY: number, radius: number): void {
  const b = breath.breath;
  const done = breath.phase === 'done';
  const r = radius * (1 - 0.17 * b);
  const alpha = done ? 0.3 : 0.1 + 0.16 * b;
  const spin = reduceMotion ? 0 : (now / 1000) * 0.09;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(spin);
  ctx.strokeStyle = `rgba(27,25,22,${alpha})`;
  ctx.lineWidth = 1;
  const gaps = done ? [1] : [0.36, 0.3, 0.24];
  let start = 0;
  for (const span of gaps) {
    ctx.beginPath();
    ctx.arc(0, 0, r, start, start + span * Math.PI * 2 * 0.92);
    ctx.stroke();
    start += span * Math.PI * 2;
  }
  ctx.restore();
}

function frame(now: number): void {
  const changed = breath.tick(now);
  if (changed) syncText(now);

  const f: Frame = {
    t: reduceMotion ? 0 : now / 1000,
    breath: breath.breath,
    index: breath.index,
    committed: breath.committed,
  };

  scene.draw(ctx, f);

  const summit = scene.summit;
  const h = scene.h;
  const figureHeight = Math.max(84, Math.min(h * 0.132, scene.w * 0.4));
  const groundY = summit.y + figureHeight * 0.02;

  ctx.save();
  drawRing(now, summit.x, groundY - figureHeight * 0.52, figureHeight * 0.62);
  ctx.restore();

  // 吸气时人稍微沉下去一点，是「炁沉丹田」而不是人在飘
  const settle = figureHeight * 0.012 * f.breath;
  drawFigure(ctx, poseNow(), summit.x, groundY + settle, figureHeight);

  stage.dataset.index = String(breath.index);
  stage.dataset.phase = breath.phase;
  stage.dataset.breaths = String(breath.snapshot(now).breaths);

  requestAnimationFrame(frame);
}

function syncText(now: number): void {
  const index = breath.index;
  const done = breath.phase === 'done';
  const shown = shownIndex(breath.phase, index);

  if (index !== lastIndex || breath.phase !== lastPhase) {
    if (done) {
      postureEl.textContent = '朝元';
      glossEl.textContent = '十三势满，云归谷底，人归山顶';
      verseEl.textContent = '一炁朝元。';
    } else if (shown < 0) {
      postureEl.textContent = '无极';
      glossEl.textContent = '还未起势，先站住';
      verseEl.textContent = '太极者，无极而生，动静之机，阴阳之母也。';
    } else {
      const posture = POSTURES[shown];
      if (posture) {
        postureEl.textContent = posture.name;
        glossEl.textContent = posture.gloss;
        verseEl.textContent = posture.verse;
      }
    }
    countEl.textContent = countLabel(shown, done);
    hintEl.textContent = hintFor(breath.phase, index);
    lastIndex = index;
    lastPhase = breath.phase;
  }

  for (let i = 0; i < ticks.length; i += 1) {
    const tick = ticks[i];
    if (tick) tick.classList.toggle('on', i < index);
  }
  void now;
}

function ease(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function requireEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`缺少元素 ${selector}`);
  return el;
}

syncText(performance.now());
requestAnimationFrame(frame);
