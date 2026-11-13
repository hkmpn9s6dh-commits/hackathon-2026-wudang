import { describe, expect, it } from 'vitest';

import { POSTURES, WUJI, blendPose, isComplete, postureAt } from '../src/postures';

describe('十三势', () => {
  it('正好十三势', () => {
    expect(POSTURES).toHaveLength(13);
  });

  it('势名不重复，且都是一个字', () => {
    const names = POSTURES.map((p) => p.name);
    expect(new Set(names).size).toBe(13);
    for (const name of names) expect([...name]).toHaveLength(1);
  });

  it('每一势都有心解、白话和歌诀', () => {
    for (const p of POSTURES) {
      expect(p.classic.length).toBeGreaterThanOrEqual(3);
      expect(p.gloss.length).toBeGreaterThanOrEqual(5);
      expect(p.verse.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('歌诀不重复', () => {
    expect(new Set(POSTURES.map((p) => p.verse)).size).toBe(13);
  });

  it('姿态参数都在合理区间', () => {
    for (const p of POSTURES) {
      expect(Math.abs(p.pose.lean)).toBeLessThanOrEqual(20);
      expect(p.pose.sink).toBeGreaterThanOrEqual(0);
      expect(p.pose.sink).toBeLessThanOrEqual(1);
      expect(p.pose.stance).toBeGreaterThan(0.4);
      expect(p.pose.stance).toBeLessThan(1.3);
      for (const angle of [...p.pose.armL, ...p.pose.armR]) {
        expect(Number.isFinite(angle)).toBe(true);
        expect(Math.abs(angle)).toBeLessThanOrEqual(200);
      }
    }
  });

  it('首势是掤，末势是定', () => {
    expect(POSTURES[0]?.name).toBe('掤');
    expect(POSTURES[12]?.name).toBe('定');
  });

  it('下标越界会绕回来，不会炸', () => {
    expect(postureAt(0)?.name).toBe('掤');
    expect(postureAt(13)?.name).toBe('掤');
    expect(postureAt(-1)?.name).toBe('定');
    expect(postureAt(100)?.name).toBe(POSTURES[100 % 13]?.name);
  });

  it('isComplete 只在走满时为真', () => {
    expect(isComplete(12)).toBe(false);
    expect(isComplete(13)).toBe(true);
    expect(isComplete(14)).toBe(true);
  });
});

describe('姿态插值', () => {
  it('t=0 取起点，t=1 取终点', () => {
    const a = WUJI;
    const b = POSTURES[4]!.pose;
    expect(blendPose(a, b, 0)).toEqual(a);
    expect(blendPose(a, b, 1)).toEqual(b);
  });

  it('t 被夹在 0..1，NaN 当 0', () => {
    const a = WUJI;
    const b = POSTURES[2]!.pose;
    expect(blendPose(a, b, -5)).toEqual(a);
    expect(blendPose(a, b, 9)).toEqual(b);
    expect(blendPose(a, b, Number.NaN)).toEqual(a);
  });

  it('中间值落在两端之间', () => {
    const a = WUJI;
    const b = POSTURES[6]!.pose;
    const mid = blendPose(a, b, 0.5);
    expect(mid.lean).toBeCloseTo((a.lean + b.lean) / 2, 6);
    expect(mid.armL[0]).toBeCloseTo((a.armL[0] + b.armL[0]) / 2, 6);
    expect(mid.armR[1]).toBeCloseTo((a.armR[1] + b.armR[1]) / 2, 6);
  });

  it('插出来的数没有 NaN', () => {
    for (let i = 0; i < 13; i += 1) {
      for (const t of [0, 0.13, 0.5, 0.77, 1]) {
        const pose = blendPose(WUJI, POSTURES[i]!.pose, t);
        for (const v of [pose.lean, pose.sink, pose.stance, pose.head, ...pose.armL, ...pose.armR]) {
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });
});
