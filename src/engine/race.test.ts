import { describe, it, expect } from 'vitest';
import { buildRaceProfiles, progressAt, speedAt } from './race';

/** 결정적 테스트용 LCG */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('buildRaceProfiles', () => {
  it('loserIndex 말이 항상 마지막에 도착한다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [2, 3, 5, 12]) {
        const loser = seed % n;
        const profiles = buildRaceProfiles(n, loser, lcg(seed));
        expect(profiles).toHaveLength(n);
        const loserTime = profiles[loser].finishTime;
        profiles.forEach((p, i) => {
          if (i !== loser) expect(p.finishTime).toBeLessThan(loserTime);
        });
      }
    }
  });

  it('꼴찌는 결승 상대보다 250~550ms 늦는다(팽팽한 접전 마진)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const n = 4;
      const loser = seed % n;
      const profiles = buildRaceProfiles(n, loser, lcg(seed));
      const otherMax = Math.max(
        ...profiles.filter((_, i) => i !== loser).map((p) => p.finishTime),
      );
      const margin = profiles[loser].finishTime - otherMax;
      expect(margin).toBeGreaterThanOrEqual(250);
      expect(margin).toBeLessThanOrEqual(550);
    }
  });

  it('접전 그룹은 꼴찌+위아래 인접 3마리이고, 나머지는 일찍(≤9.1s) 골인한다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [4, 6, 12]) {
        const loser = seed % n;
        const profiles = buildRaceProfiles(n, loser, lcg(seed));
        const order = profiles
          .map((_, i) => i)
          .sort((a, b) => profiles[a].finishTime - profiles[b].finishTime);
        const trio = order.slice(n - 3).sort((a, b) => a - b); // 마지막 3마리의 레인
        expect(trio).toContain(loser);
        // 연속된 레인 블록 — 클로즈업에 셋이 같이 잡힌다
        expect(trio[1]).toBe(trio[0] + 1);
        expect(trio[2]).toBe(trio[1] + 1);
        for (const i of order.slice(n - 3, n - 1)) {
          expect(profiles[i].finishTime).toBeGreaterThanOrEqual(10900);
        }
        for (const i of order.slice(0, n - 3)) {
          expect(profiles[i].finishTime).toBeLessThanOrEqual(9100);
        }
      }
    }
  });

  it('제어점의 t·x가 단조 증가하고 끝점은 (finishTime, 1)이다', () => {
    const profiles = buildRaceProfiles(6, 2, lcg(7));
    for (const p of profiles) {
      const pts = p.waypoints;
      expect(pts[0]).toEqual({ t: 0, x: 0 });
      expect(pts[pts.length - 1]).toEqual({ t: p.finishTime, x: 1 });
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].t).toBeGreaterThan(pts[i - 1].t);
        expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
      }
    }
  });
});

describe('events (돌·부스터)', () => {
  it('말당 정확히 3개, 종류는 rock|boost, x는 0~1 사이다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        expect(p.events.length).toBe(3);
        for (const e of p.events) {
          expect(['rock', 'boost']).toContain(e.kind);
          expect(e.x).toBeGreaterThan(0);
          expect(e.x).toBeLessThan(1);
        }
      }
    }
  });

  it('아이템은 트랙 1/4·2/4·3/4 지점에 일정한 간격으로 놓이고 시간이 겹치지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        const xs = p.events.map((e) => e.x).sort((a, b) => a - b);
        expect(xs[0]).toBeCloseTo(0.25, 5);
        expect(xs[1]).toBeCloseTo(0.5, 5);
        expect(xs[2]).toBeCloseTo(0.75, 5);
        const sorted = [...p.events].sort((a, b) => a.t - b.t);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].t).toBeGreaterThanOrEqual(sorted[i - 1].t + sorted[i - 1].duration);
        }
      }
    }
  });

  it('부스터는 끊기지 않고 1초 이상(최대 1.2초) 유지된다', () => {
    let boosts = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        for (const e of p.events) {
          if (e.kind !== 'boost') continue;
          boosts++;
          expect(e.duration).toBeGreaterThanOrEqual(1000);
          expect(e.duration).toBeLessThanOrEqual(1200);
        }
      }
    }
    expect(boosts).toBeGreaterThan(20);
  });

  it('돌 구간에선 거의 멈추고 부스터 구간에선 평균보다 빠르다', () => {
    let rocks = 0;
    let boosts = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        const avgSpeed = 1 / p.finishTime;
        for (const e of p.events) {
          const speed =
            (progressAt(p, e.t + e.duration) - progressAt(p, e.t)) / e.duration;
          if (e.kind === 'rock') {
            rocks++;
            expect(speed).toBeLessThan(avgSpeed * 0.2);
          } else {
            boosts++;
            // 접전 듀오(느린 말)는 확실히 빠르게, 일찍 골인하는 말은 원래 빨라서 배율이 낮다
            expect(speed).toBeGreaterThan(avgSpeed * (p.finishTime > 10000 ? 1.5 : 0.85));
          }
        }
      }
    }
    // 표본이 실제로 검증됐는지 보장
    expect(rocks).toBeGreaterThan(10);
    expect(boosts).toBeGreaterThan(10);
  });
});

describe('역전 리듬', () => {
  it('선두 그룹이 달리는 동안 선두가 최소 한 번은 바뀐다 (대부분의 판)', () => {
    let changed = 0;
    const SEEDS = 30;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const profiles = buildRaceProfiles(6, seed % 6, lcg(seed));
      // 첫 골인 전까지가 전원이 함께 달리는 관전 구간
      const end = Math.min(...profiles.map((p) => p.finishTime));
      const leaders = new Set<number>();
      for (let t = end * 0.1; t <= end * 0.95; t += end * 0.05) {
        let lead = 0;
        let best = -1;
        profiles.forEach((p, i) => {
          const x = progressAt(p, t);
          if (x > best) {
            best = x;
            lead = i;
          }
        });
        leaders.add(lead);
      }
      if (leaders.size >= 2) changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(SEEDS * 0.6);
  });

  it('마지막 세 마리는 홀로 남은 구간 내내 바짝 붙어 접전한다', () => {
    const SEEDS = 30;
    let swapsTotal = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const n = 5;
      const loser = seed % n;
      const profiles = buildRaceProfiles(n, loser, lcg(seed));
      const order = profiles
        .map((_, i) => i)
        .sort((a, b) => profiles[a].finishTime - profiles[b].finishTime);
      const trio = order.slice(n - 3);
      const from = profiles[order[n - 4]].finishTime + 300; // 나머지 전원 골인 후
      const to = profiles[trio[0]].finishTime - 100;
      let gapSum = 0;
      let count = 0;
      let prevSign = 0;
      for (let t = from; t <= to; t += (to - from) / 20) {
        const xs = trio.map((i) => progressAt(profiles[i], t));
        gapSum += Math.max(...xs) - Math.min(...xs); // 셋의 전체 퍼짐
        count++;
        const sign = Math.sign(xs[1] - xs[2]); // 둘째-꼴찌 순위 스왑 관찰
        if (prevSign !== 0 && sign !== 0 && sign !== prevSign) swapsTotal++;
        if (sign !== 0) prevSign = sign;
      }
      // 접전: 셋의 평균 퍼짐이 트랙의 15% 이내
      expect(gapSum / count).toBeLessThan(0.15);
    }
    // 접전 그룹 안에서도 엎치락뒤치락이 일어난다 (시드 전체 합산)
    expect(swapsTotal).toBeGreaterThanOrEqual(SEEDS * 0.5);
  });
});

describe('속도 완충 (부드러운 가감속)', () => {
  it('제어점 경계에서 속도가 끊기지 않고 연속이다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const p of buildRaceProfiles(3, seed % 3, lcg(seed))) {
        const avg = 1 / p.finishTime;
        // 내부 제어점 앞뒤 0.1ms의 속도 차가 평균 속도의 30% 이내 — 점프(불연속) 검출
        for (let i = 1; i < p.waypoints.length - 1; i++) {
          const t = p.waypoints[i].t;
          const before = speedAt(p, t - 0.1);
          const after = speedAt(p, t + 0.1);
          expect(Math.abs(after - before)).toBeLessThan(avg * 0.3);
        }
      }
    }
  });
});

describe('speedAt', () => {
  it('달리는 동안 양수, 도착 후에는 0이다', () => {
    const profiles = buildRaceProfiles(4, 1, lcg(5));
    for (const p of profiles) {
      for (let t = 0; t < p.finishTime; t += 100) {
        expect(speedAt(p, t)).toBeGreaterThan(0);
      }
      expect(speedAt(p, p.finishTime)).toBe(0);
      expect(speedAt(p, p.finishTime + 500)).toBe(0);
    }
  });

  it('돌 구간에선 평균의 20% 미만, 부스터 구간에선 평균보다 빠르다', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        const avg = 1 / p.finishTime;
        for (const e of p.events) {
          const mid = speedAt(p, e.t + e.duration / 2);
          if (e.kind === 'rock') expect(mid).toBeLessThan(avg * 0.2);
          else expect(mid).toBeGreaterThan(avg * (p.finishTime > 10000 ? 1.5 : 0.85));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('구간 기울기와 일치한다 (progressAt 미분)', () => {
    const [p] = buildRaceProfiles(3, 0, lcg(9));
    const dt = 0.5;
    for (let t = 200; t < p.finishTime - 200; t += 500) {
      // 제어점 경계를 걸치는 표본은 건너뛴다 — 한 구간 안에서 중앙차분과 비교
      if (p.waypoints.some((w) => w.t > t - dt && w.t < t + dt)) continue;
      const numeric = (progressAt(p, t + dt) - progressAt(p, t - dt)) / (2 * dt);
      expect(Math.abs(speedAt(p, t) - numeric)).toBeLessThan(1e-6);
    }
  });
});

describe('progressAt', () => {
  it('t=0에서 0, finishTime 이후에는 1이다', () => {
    const [p] = buildRaceProfiles(3, 1, lcg(3));
    expect(progressAt(p, 0)).toBe(0);
    expect(progressAt(p, p.finishTime)).toBe(1);
    expect(progressAt(p, p.finishTime + 999)).toBe(1);
  });

  it('시간에 대해 단조 증가한다', () => {
    const profiles = buildRaceProfiles(5, 0, lcg(11));
    for (const p of profiles) {
      let prev = -1;
      for (let t = 0; t <= p.finishTime; t += 50) {
        const x = progressAt(p, t);
        expect(x).toBeGreaterThanOrEqual(prev);
        prev = x;
      }
    }
  });
});
