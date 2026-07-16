import { describe, it, expect } from 'vitest';
import { assignCards, spinPlan } from './cardSlot';

/** 결정적 테스트용 LCG */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('assignCards', () => {
  it('참가자↔카드가 전단사(모든 카드가 정확히 한 번)다', () => {
    for (let n = 2; n <= 12; n++) {
      for (let seed = 1; seed <= 10; seed++) {
        const cardOf = assignCards(n, lcg(seed * n));
        expect([...cardOf].sort((a, b) => a - b)).toEqual(
          Array.from({ length: n }, (_, i) => i),
        );
      }
    }
  });
});

describe('spinPlan', () => {
  it('경로는 available만 방문하고 마지막은 target이며 2바퀴 이상 돈다', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = lcg(seed);
      const available = [0, 2, 3, 5, 7].slice(0, 2 + (seed % 4));
      const target = available[seed % available.length];
      const { path, delays } = spinPlan(available, target, rand);
      expect(path.length).toBe(delays.length);
      expect(path[path.length - 1]).toBe(target);
      for (const c of path) expect(available).toContain(c);
      if (available.length >= 2) {
        expect(path.length).toBeGreaterThanOrEqual(available.length * 2);
      }
    }
  });

  it('틱 간격은 70ms에서 시작해 450ms까지 단조 증가한다', () => {
    const rand = lcg(7);
    const { delays } = spinPlan([0, 1, 2, 3, 4, 5], 3, rand);
    expect(delays[0]).toBeGreaterThanOrEqual(70 - 1e-9);
    expect(delays[delays.length - 1]).toBeLessThanOrEqual(450 + 1e-9);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it('카드가 하나 남았어도 최소 몇 틱은 돈다', () => {
    const { path } = spinPlan([4], 4, lcg(3));
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path.every((c) => c === 4)).toBe(true);
  });
});
