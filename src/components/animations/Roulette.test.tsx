import { describe, it, expect } from 'vitest';
import { buildWheel } from './Roulette';
import { outcomeLabel } from '../../labels';
import type { Participant, Outcome, DrawResult } from '../../types';

const p = (id: string): Participant => ({ id, name: id, token: id });
const o = (id: string, label: string): Outcome => ({ id, label });

describe('buildWheel - assign (참가자 > outcomes, blank 패딩 포함)', () => {
  it('모든 참가자에 대해, 룰렛이 멈추는 조각의 라벨이 엔진 결과(꽝 포함)와 일치한다', () => {
    // 4명, outcome 2개 → draw()가 blank-0, blank-1 두 개로 패딩하는 상황을 그대로 구성
    const participants = [p('p1'), p('p2'), p('p3'), p('p4')];
    const outcomes = [o('o1', 'A'), o('o2', 'B')];
    const result: DrawResult = {
      mode: 'assign',
      assignments: {
        p1: 'o1',
        p2: 'o2',
        p3: 'blank-0',
        p4: 'blank-1',
      },
    };

    const { slices, targetSeq } = buildWheel(participants, outcomes, result);

    participants.forEach((participant, i) => {
      const expected = outcomeLabel(outcomes, result.assignments[participant.id]);
      expect(slices[targetSeq[i]]).toBe(expected);
    });
  });
});

describe('buildWheel - single', () => {
  it('당첨자가 멈추는 조각이 당첨자의 토큰과 일치한다', () => {
    const participants = [p('p1'), p('p2'), p('p3')];
    const result: DrawResult = { mode: 'single', winnerId: 'p2' };

    const { slices, targetSeq } = buildWheel(participants, [], result);

    expect(slices[targetSeq[0]]).toBe('p2');
  });
});
