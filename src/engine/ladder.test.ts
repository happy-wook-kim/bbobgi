import { describe, it, expect } from 'vitest';
import { permToRungs, applyRungs } from './ladder';

describe('ladder permToRungs', () => {
  it('가로줄을 적용하면 원래 순열이 복원된다', () => {
    const perm = [2, 0, 3, 1];
    const rungs = permToRungs(perm);
    expect(applyRungs(rungs, perm.length)).toEqual(perm);
  });

  it('항등 순열은 가로줄이 없다', () => {
    expect(permToRungs([0, 1, 2, 3])).toEqual([]);
  });

  it('각 행에는 가로줄이 하나뿐이다', () => {
    const rungs = permToRungs([3, 2, 1, 0]);
    const rows = rungs.map((r) => r.row);
    expect(new Set(rows).size).toBe(rows.length);
  });
});
