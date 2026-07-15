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

  it('꼴찌는 나머지 중 최후 도착보다 300~800ms 늦는다(접전 마진)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const n = 4;
      const loser = seed % n;
      const profiles = buildRaceProfiles(n, loser, lcg(seed));
      const otherMax = Math.max(
        ...profiles.filter((_, i) => i !== loser).map((p) => p.finishTime),
      );
      const margin = profiles[loser].finishTime - otherMax;
      expect(margin).toBeGreaterThanOrEqual(300);
      expect(margin).toBeLessThanOrEqual(800);
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
            expect(speed).toBeGreaterThan(avgSpeed * 1.35);
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
  it('선두가 레이스 중 최소 한 번은 바뀐다 (대부분의 판)', () => {
    let changed = 0;
    const SEEDS = 30;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const profiles = buildRaceProfiles(4, seed % 4, lcg(seed));
      const end = Math.max(...profiles.map((p) => p.finishTime));
      const leaders = new Set<number>();
      for (let t = end * 0.1; t <= end * 0.9; t += end * 0.05) {
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
    expect(changed).toBeGreaterThanOrEqual(SEEDS * 0.8);
  });

  it('선두 교체가 판당 평균 4회 이상 일어난다 (극적인 엎치락뒤치락)', () => {
    let transitions = 0;
    const SEEDS = 30;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const profiles = buildRaceProfiles(4, seed % 4, lcg(seed));
      const end = Math.max(...profiles.map((p) => p.finishTime));
      let prevLead = -1;
      for (let t = end * 0.05; t <= end * 0.95; t += end * 0.025) {
        let lead = 0;
        let best = -1;
        profiles.forEach((p, i) => {
          const x = progressAt(p, t);
          if (x > best) {
            best = x;
            lead = i;
          }
        });
        if (prevLead >= 0 && lead !== prevLead) transitions++;
        prevLead = lead;
      }
    }
    expect(transitions / SEEDS).toBeGreaterThanOrEqual(4);
  });

  // 부스터 1초 유지(+반납 구간)가 정당한 선두 시간을 만들므로 상한은 45%
  it('한 말이 레이스의 45%를 넘겨 독주하지 않는다 (평균)', () => {
    let ratioSum = 0;
    const SEEDS = 30;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const profiles = buildRaceProfiles(4, seed % 4, lcg(seed));
      const end = Math.max(...profiles.map((p) => p.finishTime));
      const leaders: number[] = [];
      for (let t = end * 0.05; t <= end * 0.95; t += end * 0.025) {
        let lead = 0;
        let best = -1;
        profiles.forEach((p, i) => {
          const x = progressAt(p, t);
          if (x > best) {
            best = x;
            lead = i;
          }
        });
        leaders.push(lead);
      }
      let cur = 1;
      let max = 1;
      for (let i = 1; i < leaders.length; i++) {
        cur = leaders[i] === leaders[i - 1] ? cur + 1 : 1;
        max = Math.max(max, cur);
      }
      ratioSum += max / leaders.length;
    }
    expect(ratioSum / SEEDS).toBeLessThanOrEqual(0.45);
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

  it('돌 구간에선 평균의 20% 미만, 부스터 구간에선 평균의 1.35배 초과다', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const p of buildRaceProfiles(4, seed % 4, lcg(seed))) {
        const avg = 1 / p.finishTime;
        for (const e of p.events) {
          const mid = speedAt(p, e.t + e.duration / 2);
          if (e.kind === 'rock') expect(mid).toBeLessThan(avg * 0.2);
          else expect(mid).toBeGreaterThan(avg * 1.35);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('구간 기울기와 일치한다 (progressAt 미분)', () => {
    const [p] = buildRaceProfiles(3, 0, lcg(9));
    const dt = 1;
    for (let t = 200; t < p.finishTime - 200; t += 500) {
      // 제어점 경계를 걸치는 표본은 건너뛴다 — 기울기는 한 구간 안에서만 일정하다
      if (p.waypoints.some((w) => w.t > t && w.t < t + dt)) continue;
      const numeric = (progressAt(p, t + dt) - progressAt(p, t)) / dt;
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
