import { describe, it, expect } from 'vitest';
import { draw } from './draw';
import type { Participant, Outcome } from '../types';

const p = (id: string): Participant => ({ id, name: id, token: id });
const o = (id: string): Outcome => ({ id, label: id });

describe('draw - single', () => {
  it('참가자 중 정확히 한 명을 뽑는다', () => {
    const parts = [p('a'), p('b'), p('c')];
    const result = draw('single', parts, [], () => 0);
    expect(result.mode).toBe('single');
    if (result.mode === 'single') {
      expect(parts.map((x) => x.id)).toContain(result.winnerId);
    }
  });
});

describe('draw - assign', () => {
  it('모든 참가자에게 결과를 배정한다', () => {
    const parts = [p('a'), p('b'), p('c')];
    const outs = [o('x'), o('y'), o('z')];
    const result = draw('assign', parts, outs, Math.random);
    expect(result.mode).toBe('assign');
    if (result.mode === 'assign') {
      expect(Object.keys(result.assignments).sort()).toEqual(['a', 'b', 'c']);
    }
  });

  it('결과에 중복 배정이 없다', () => {
    const parts = [p('a'), p('b'), p('c')];
    const outs = [o('x'), o('y'), o('z')];
    const result = draw('assign', parts, outs, Math.random);
    if (result.mode === 'assign') {
      const assigned = Object.values(result.assignments);
      expect(new Set(assigned).size).toBe(3);
    }
  });

  it('결과가 부족하면 꽝으로 채운다', () => {
    const parts = [p('a'), p('b'), p('c'), p('d')];
    const outs = [o('x'), o('y')];
    const result = draw('assign', parts, outs, Math.random);
    if (result.mode === 'assign') {
      const values = Object.values(result.assignments);
      expect(values).toHaveLength(4);
      expect(values.filter((v) => v.startsWith('blank-')).length).toBe(2);
    }
  });
});
