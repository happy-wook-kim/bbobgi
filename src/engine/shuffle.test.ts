import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('원본 배열을 변경하지 않는다', () => {
    const input = [1, 2, 3, 4];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('같은 원소를 모두 보존한다', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it('rand를 주입하면 결정론적으로 동작한다', () => {
    // rand가 항상 0을 반환하면 매 단계 j=0 → 각 원소가 앞으로 회전
    const input = ['a', 'b', 'c'];
    const result = shuffle(input, () => 0);
    expect(result).toEqual(['b', 'c', 'a']);
  });
});
