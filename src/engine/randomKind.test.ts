import { describe, it, expect } from 'vitest';
import { randomKind, shuffleKinds } from './randomKind';
import { GAME_KINDS } from '../games';

const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('randomKind', () => {
  it('레지스트리의 게임 중 하나를 반환한다', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(GAME_KINDS).toContain(randomKind(() => r));
    }
  });
});

describe('shuffleKinds', () => {
  it('레지스트리의 모든 게임이 정확히 한 번씩 들어 있다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const bag = shuffleKinds(null, lcg(seed));
      expect([...bag].sort()).toEqual([...GAME_KINDS].sort());
    }
  });

  it('직전 게임이 다음 백의 첫 판에 나오지 않는다', () => {
    for (const last of GAME_KINDS) {
      for (let seed = 1; seed <= 30; seed++) {
        expect(shuffleKinds(last, lcg(seed))[0]).not.toBe(last);
      }
    }
  });
});
