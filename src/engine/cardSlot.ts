import { shuffle } from './shuffle';

const TICK_MIN = 70; // 첫 틱 간격(ms) — 빠르게 띡띡띡
const TICK_MAX = 450; // 마지막 틱 간격 — 느리게 … 띡 … 띡
const TICK_POW = 2.2; // 감속 곡선(거듭제곱) — 마지막에 급격히 느려진다

/** 참가자 → 카드 배정 (균등 전단사). cardOf[참가자] = 그 사람이 뽑을 카드. */
export function assignCards(n: number, rand: () => number = Math.random): number[] {
  return shuffle(
    Array.from({ length: n }, (_, i) => i),
    rand,
  );
}

/**
 * 슬롯 포커스 경로: available 카드들을 순서대로 2~3바퀴 돌고 정확히 target에서 멈춘다.
 * delays[i]는 path[i]로 넘어가기까지의 간격(ms) — 점차 느려진다.
 */
export function spinPlan(
  available: number[],
  target: number,
  rand: () => number = Math.random,
): { path: number[]; delays: number[] } {
  const len = available.length;
  const idx = available.indexOf(target);
  const loops = 2 + Math.floor(rand() * 2); // 2~3바퀴
  const steps = loops * len + idx; // 마지막 스텝(k=steps)이 target(idx)에 떨어지도록
  const path: number[] = [];
  const delays: number[] = [];
  for (let k = 1; k <= steps; k++) {
    path.push(available[k % len]);
    const p = steps === 1 ? 1 : (k - 1) / (steps - 1);
    delays.push(TICK_MIN + (TICK_MAX - TICK_MIN) * Math.pow(p, TICK_POW));
  }
  return { path, delays };
}
