import { describe, it, expect } from 'vitest';
import { assignTokens } from './tokens';

describe('assignTokens', () => {
  it('count 개수만큼 반환한다', () => {
    expect(assignTokens(5)).toHaveLength(5);
  });

  it('풀 크기 이하에서는 모두 서로 다르다', () => {
    const result = assignTokens(8);
    expect(new Set(result).size).toBe(8);
  });

  it('풀 크기를 초과해도 모두 서로 다르다', () => {
    const result = assignTokens(100);
    expect(result).toHaveLength(100);
    expect(new Set(result).size).toBe(100);
  });

  it('rand 주입 시 결정론적이다', () => {
    const a = assignTokens(4, () => 0);
    const b = assignTokens(4, () => 0);
    expect(a).toEqual(b);
  });
});
