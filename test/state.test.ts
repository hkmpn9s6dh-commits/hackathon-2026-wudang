import { describe, expect, it } from 'vitest';

import { Breath, EXHALE_MS, INHALE_MS, MIN_HOLD_MS, TOTAL } from '../src/state';

describe('呼吸状态机', () => {
  it('一开始是 idle，零势', () => {
    const b = new Breath();
    expect(b.phase).toBe('idle');
    expect(b.index).toBe(0);
    expect(b.breath).toBe(0);
  });

  it('按下进入 inhale，并记一次呼吸', () => {
    const b = new Breath();
    expect(b.press(1000)).toBe(true);
    expect(b.phase).toBe('inhale');
    expect(b.snapshot(1000).breaths).toBe(1);
  });

  it('吸入在 INHALE_MS 内线性涨到 1，之后停在满息等', () => {
    const b = new Breath();
    b.press(0);
    b.tick(INHALE_MS / 2);
    expect(b.breath).toBeCloseTo(0.5, 5);
    b.tick(INHALE_MS);
    expect(b.breath).toBe(1);
    b.tick(INHALE_MS * 5);
    expect(b.breath).toBe(1);
    expect(b.phase).toBe('inhale');
  });

  it('按得太短：松手也不进势', () => {
    const b = new Breath();
    b.press(0);
    b.tick(100);
    expect(b.release(MIN_HOLD_MS - 1)).toBe(true);
    expect(b.committed).toBe(false);
    b.tick(MIN_HOLD_MS - 1 + EXHALE_MS + 1);
    expect(b.index).toBe(0);
    expect(b.phase).toBe('idle');
  });

  it('按够 MIN_HOLD_MS：呼气结束后进一势', () => {
    const b = new Breath();
    b.press(0);
    b.tick(INHALE_MS);
    b.release(MIN_HOLD_MS);
    expect(b.committed).toBe(true);
    b.tick(MIN_HOLD_MS + EXHALE_MS / 2);
    expect(b.index).toBe(0);
    b.tick(MIN_HOLD_MS + EXHALE_MS + 1);
    expect(b.index).toBe(1);
    expect(b.phase).toBe('idle');
  });

  it('呼气时 breath 从 1 落到 0', () => {
    const b = new Breath();
    b.press(0);
    b.tick(INHALE_MS);
    b.release(1000);
    b.tick(1000 + EXHALE_MS / 2);
    expect(b.breath).toBeCloseTo(0.5, 5);
    b.tick(1000 + EXHALE_MS);
    expect(b.breath).toBe(0);
  });

  it('没按就松手什么也不做', () => {
    const b = new Breath();
    expect(b.release(500)).toBe(false);
    expect(b.phase).toBe('idle');
  });

  it('吸着的时候再按下不算', () => {
    const b = new Breath();
    b.press(0);
    expect(b.press(10)).toBe(false);
    expect(b.snapshot(10).breaths).toBe(1);
  });

  it('十三势走满就停在 done', () => {
    const b = new Breath();
    let now = 0;
    for (let i = 0; i < TOTAL; i += 1) {
      b.press(now);
      b.tick(now + INHALE_MS);
      b.release(now + MIN_HOLD_MS + 10);
      b.tick(now + MIN_HOLD_MS + EXHALE_MS + 20);
      now += MIN_HOLD_MS + EXHALE_MS + 40;
    }
    expect(b.index).toBe(TOTAL);
    expect(b.phase).toBe('done');
    expect(b.press(now)).toBe(false);
  });

  it('走满之后再 reset 回到开头', () => {
    const b = new Breath();
    let now = 0;
    for (let i = 0; i < TOTAL; i += 1) {
      b.press(now);
      b.tick(now + INHALE_MS);
      b.release(now + MIN_HOLD_MS + 10);
      b.tick(now + MIN_HOLD_MS + EXHALE_MS + 20);
      now += MIN_HOLD_MS + EXHALE_MS + 40;
    }
    b.reset();
    expect(b.phase).toBe('idle');
    expect(b.index).toBe(0);
    expect(b.breath).toBe(0);
  });

  it('时间倒流也不会把 breath 算成负数', () => {
    const b = new Breath();
    b.press(1000);
    b.tick(500);
    expect(b.breath).toBe(0);
  });

  it('NaN 时间不炸，按 0 处理', () => {
    const b = new Breath();
    b.press(0);
    b.tick(Number.NaN);
    expect(Number.isFinite(b.breath)).toBe(true);
  });
});
