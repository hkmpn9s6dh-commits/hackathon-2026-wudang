/** 画面上的字怎么变，全部收在这里，好让单测把「第几势」「该提示什么」钉死。 */

import { POSTURES } from './postures';
import type { Phase } from './state';

export const CHINESE = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'] as const;

/**
 * 现在该显示第几势（0 起）。
 * 吸气/呼气时说的是「正在起的这一势」；站定时说的是「刚走完的那一势」；
 * 一口气都还没吸过时是 -1（无极）。
 */
export function shownIndex(phase: Phase, index: number): number {
  if (index <= 0) return -1;
  if (phase === 'idle' || phase === 'done') return Math.min(index - 1, POSTURES.length - 1);
  return Math.min(index, POSTURES.length - 1);
}

export function countLabel(shown: number, done: boolean): string {
  if (done) return '十 三 势 已 满';
  if (shown < 0) return '未 起 势';
  const name = CHINESE[Math.min(shown, CHINESE.length - 1)];
  return `第 ${name} 势`;
}

export function hintFor(phase: Phase, index: number): string {
  if (phase === 'done') return '再走一遍';
  if (index <= 0 && phase === 'idle') return '按住 · 吸气';
  if (phase === 'inhale') return '松手 · 落势';
  return '按住 · 再吸一口气';
}
