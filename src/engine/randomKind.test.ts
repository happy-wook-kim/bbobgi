import { describe, it, expect } from 'vitest';
import { randomKind, shuffleKinds } from './randomKind';
import type { AnimationKind } from '../types';

const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('randomKind', () => {
  it('네 게임 중 하나를 반환한다', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(['card', 'roulette', 'ladder', 'horse']).toContain(randomKind(() => r));
    }
  });
});

describe('shuffleKinds', () => {
  it('네 게임이 정확히 한 번씩 들어 있다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const bag = shuffleKinds(null, lcg(seed));
      expect([...bag].sort()).toEqual(['card', 'horse', 'ladder', 'roulette']);
    }
  });

  it('직전 게임이 다음 백의 첫 판에 나오지 않는다', () => {
    const kinds: AnimationKind[] = ['card', 'roulette', 'ladder', 'horse'];
    for (const last of kinds) {
      for (let seed = 1; seed <= 30; seed++) {
        expect(shuffleKinds(last, lcg(seed))[0]).not.toBe(last);
      }
    }
  });
});
