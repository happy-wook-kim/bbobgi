import type { Mode, Participant, Outcome, DrawResult } from '../types';
import { shuffle } from './shuffle';

/** 참가자 수 n에 맞춰 결과 목록을 준비한다. 부족하면 꽝을 추가하고, 셔플 후 앞에서 n개를 쓴다. */
function prepareOutcomes(outcomes: Outcome[], n: number, rand: () => number): Outcome[] {
  const pool = [...outcomes];
  let i = 0;
  while (pool.length < n) {
    pool.push({ id: `blank-${i}`, label: '꽝' });
    i++;
  }
  return shuffle(pool, rand).slice(0, n);
}

export function draw(
  mode: Mode,
  participants: Participant[],
  outcomes: Outcome[],
  rand: () => number = Math.random,
): DrawResult {
  if (mode === 'single') {
    const winner = shuffle(participants, rand)[0];
    return { mode: 'single', winnerId: winner.id };
  }

  const prepared = prepareOutcomes(outcomes, participants.length, rand);
  const assignments: Record<string, string> = {};
  participants.forEach((participant, index) => {
    assignments[participant.id] = prepared[index].id;
  });
  return { mode: 'assign', assignments };
}
