import { describe, it, expect } from 'vitest';
import { pickWinner } from './pick';

describe('pickWinner', () => {
  it('0 이상 count 미만의 인덱스를 반환한다', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const idx = pickWinner(5, () => r);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(5);
    }
  });

  it('rand=0이면 첫 번째(0)를 뽑는다', () => {
    expect(pickWinner(4, () => 0)).toBe(0);
  });

  it('rand≈0.99면 마지막을 뽑는다', () => {
    expect(pickWinner(4, () => 0.99)).toBe(3);
  });
});
