import { describe, expect, it } from 'vitest';

import { CHINESE, countLabel, hintFor, shownIndex } from '../src/labels';
import { mulberry32, pick, range } from '../src/rng';

describe('文案', () => {
  it('十三势都用汉字数，不出现第十四', () => {
    expect(CHINESE).toHaveLength(13);
    expect(countLabel(0, false)).toBe('第 一 势');
    expect(countLabel(12, false)).toBe('第 十三 势');
  });

  it('还没起势时写「未起势」，走满时写「已满」', () => {
    expect(countLabel(-1, false)).toBe('未 起 势');
    expect(countLabel(12, true)).toBe('十 三 势 已 满');
  });

  it('站定时说的是刚走完的那一势，吸气时说的是正在起的那一势', () => {
    expect(shownIndex('idle', 3)).toBe(2);
    expect(shownIndex('inhale', 3)).toBe(3);
    expect(shownIndex('exhale', 3)).toBe(3);
    expect(shownIndex('done', 13)).toBe(12);
  });

  it('一口气都没吸过时是 -1', () => {
    expect(shownIndex('idle', 0)).toBe(-1);
  });

  it('提示语跟着状态走', () => {
    expect(hintFor('idle', 0)).toBe('按住 · 吸气');
    expect(hintFor('inhale', 4)).toBe('松手 · 落势');
    expect(hintFor('idle', 4)).toBe('按住 · 再吸一口气');
    expect(hintFor('done', 13)).toBe('再走一遍');
  });
});

describe('种子随机', () => {
  it('同一个种子给出同一串数', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const left = Array.from({ length: 20 }, () => a());
    const right = Array.from({ length: 20 }, () => b());
    expect(left).toEqual(right);
  });

  it('不同种子给不同结果', () => {
    const a = Array.from({ length: 10 }, mulberry32(1));
    const b = Array.from({ length: 10 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('输出落在 [0,1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range 不出界', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 300; i += 1) {
      const v = range(rng, -3, 5);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick 不会取到空数组之外', () => {
    const rng = mulberry32(11);
    expect(pick(rng, [])).toBeUndefined();
    for (let i = 0; i < 100; i += 1) {
      expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']));
    }
  });
});
