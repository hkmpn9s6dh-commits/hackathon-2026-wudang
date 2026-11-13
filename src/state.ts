/**
 * 呼吸状态机。纯逻辑、不碰 DOM、时间由外面给，所以可以在单测里按毫秒推。
 *
 *   idle --press--> inhale --release(held>=MIN_HOLD)--> exhale --> idle（进一势）
 *                       \--release(held<MIN_HOLD)--> exhale(退回) --> idle（不动）
 *
 * inhale 到 1 就停在满息上等，不自己往下走：呼吸的主动权在人手里。
 */

export const INHALE_MS = 1400;
export const EXHALE_MS = 1250;
export const MIN_HOLD_MS = 620;
export const TOTAL = 13;

export type Phase = 'idle' | 'inhale' | 'exhale' | 'done';

export interface Snapshot {
  phase: Phase;
  /** 0..1，吸气/呼气的进度 */
  breath: number;
  /** 已经走完的势数 0..13 */
  index: number;
  /** 这一次呼吸会不会进势 */
  committed: boolean;
  /** 这一口气按了多久 */
  held: number;
  /** 一共呼吸了几次（含没进势的） */
  breaths: number;
}

export class Breath {
  #phase: Phase = 'idle';
  #index = 0;
  #startedAt = 0;
  #breath = 0;
  #committed = false;
  #breaths = 0;

  get index(): number {
    return this.#index;
  }

  get phase(): Phase {
    return this.#phase;
  }

  get breath(): number {
    return this.#breath;
  }

  get committed(): boolean {
    return this.#committed;
  }

  press(now: number): boolean {
    if (this.#phase === 'done') return false;
    if (this.#phase === 'inhale' || this.#phase === 'exhale') return false;
    this.#phase = 'inhale';
    this.#startedAt = now;
    this.#committed = false;
    this.#breath = 0;
    this.#breaths += 1;
    return true;
  }

  release(now: number): boolean {
    if (this.#phase !== 'inhale') return false;
    const held = Math.max(0, now - this.#startedAt);
    this.#committed = held >= MIN_HOLD_MS;
    this.#phase = 'exhale';
    this.#startedAt = now;
    this.#breath = this.#committed ? this.#breath : 1;
    return true;
  }

  /** 每帧调用；返回 true 表示这一帧发生了状态迁移，需要重画文字。 */
  tick(now: number): boolean {
    if (this.#phase === 'inhale') {
      const next = clamp01((now - this.#startedAt) / INHALE_MS);
      const changed = next !== this.#breath;
      this.#breath = next;
      return changed;
    }
    if (this.#phase === 'exhale') {
      const elapsed = Math.max(0, now - this.#startedAt);
      const next = clamp01(elapsed / EXHALE_MS);
      const changed = next !== this.#breath;
      this.#breath = this.#committed ? 1 - next : next;
      if (elapsed >= EXHALE_MS) {
        if (this.#committed) this.#index += 1;
        this.#committed = false;
        this.#breath = 0;
        this.#phase = this.#index >= TOTAL ? 'done' : 'idle';
        return true;
      }
      return changed;
    }
    return false;
  }

  reset(): void {
    this.#phase = 'idle';
    this.#index = 0;
    this.#breath = 0;
    this.#committed = false;
    this.#breaths = 0;
    this.#startedAt = 0;
  }

  snapshot(now: number): Snapshot {
    const held = this.#phase === 'inhale' ? Math.max(0, now - this.#startedAt) : 0;
    return {
      phase: this.#phase,
      breath: this.#breath,
      index: this.#index,
      committed: this.#committed,
      held,
      breaths: this.#breaths,
    };
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
