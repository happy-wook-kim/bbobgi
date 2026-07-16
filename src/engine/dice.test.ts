import { describe, it, expect } from 'vitest';
import {
  zoneRects,
  zoneOf,
  stepBody,
  slamImpulse,
  isStopped,
  randSlamCount,
  slamInterval,
} from './dice';

/** 결정적 테스트용 LCG */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('zoneRects / zoneOf', () => {
  it('구역 면적이 전부 1/n로 균등하고 보드(0~1) 안에 있다', () => {
    for (let n = 2; n <= 12; n++) {
      const rects = zoneRects(n);
      expect(rects).toHaveLength(n);
      let total = 0;
      for (const r of rects) {
        expect(Math.abs(r.w * r.h - 1 / n)).toBeLessThan(1e-9);
        expect(r.x).toBeGreaterThanOrEqual(-1e-9);
        expect(r.y).toBeGreaterThanOrEqual(-1e-9);
        expect(r.x + r.w).toBeLessThanOrEqual(1 + 1e-9);
        expect(r.y + r.h).toBeLessThanOrEqual(1 + 1e-9);
        total += r.w * r.h;
      }
      expect(Math.abs(total - 1)).toBeLessThan(1e-9);
    }
  });

  it('각 구역 중심 좌표는 자기 인덱스로 판정된다', () => {
    for (let n = 2; n <= 12; n++) {
      zoneRects(n).forEach((r, i) => {
        expect(zoneOf({ x: r.x + r.w / 2, y: r.y + r.h / 2 }, n)).toBe(i);
      });
    }
  });
});

describe('randSlamCount', () => {
  it('10~20 사이의 정수를 반환한다', () => {
    for (const r of [0, 0.001, 0.5, 0.999]) {
      const c = randSlamCount(() => r);
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(10);
      expect(c).toBeLessThanOrEqual(20);
    }
    expect(randSlamCount(() => 0)).toBe(10);
    expect(randSlamCount(() => 0.999)).toBe(20);
  });
});

describe('slamInterval', () => {
  it('초반엔 매우 빠르고(≤0.2s) 점차 느려지다 마지막 5회는 0.9s다', () => {
    const initial = 20;
    // 첫 슬램(remaining=initial)은 아주 빠르게
    expect(slamInterval(initial, initial)).toBeLessThanOrEqual(0.2);
    // 남을수록 간격이 단조 증가
    let prev = 0;
    for (let remaining = initial; remaining > 5; remaining--) {
      const iv = slamInterval(remaining, initial);
      expect(iv).toBeGreaterThanOrEqual(prev);
      prev = iv;
    }
    // 마지막 5회(5,4,3,2,1)는 현재 페이스 고정
    for (let remaining = 5; remaining >= 1; remaining--) {
      expect(slamInterval(remaining, initial)).toBeCloseTo(0.9, 9);
    }
  });

  it('최소 횟수(10)에서도 동일한 규칙이 성립한다', () => {
    const initial = 10;
    expect(slamInterval(initial, initial)).toBeLessThanOrEqual(0.2);
    expect(slamInterval(6, initial)).toBeLessThan(0.9);
    expect(slamInterval(5, initial)).toBeCloseTo(0.9, 9);
  });
});

describe('stepBody / slamImpulse', () => {
  it('마찰로 감속해 15초 안에 멈추고 보드 밖으로 나가지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      let body = {
        pos: { x: 0.5, y: 0.5 },
        vel: { x: (rand() - 0.5) * 3, y: (rand() - 0.5) * 3 },
      };
      let stopped = false;
      for (let t = 0; t < 15; t += 1 / 60) {
        body = stepBody(body, 1 / 60);
        expect(body.pos.x).toBeGreaterThanOrEqual(0);
        expect(body.pos.x).toBeLessThanOrEqual(1);
        expect(body.pos.y).toBeGreaterThanOrEqual(0);
        expect(body.pos.y).toBeLessThanOrEqual(1);
        if (isStopped(body)) {
          stopped = true;
          break;
        }
      }
      expect(stopped).toBe(true);
    }
  });

  it('슬램은 위치를 바꾸지 않고 속도를 키운다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      const body = { pos: { x: 0.3, y: 0.7 }, vel: { x: 0.01, y: 0 } };
      const hit = slamImpulse(body, rand);
      expect(hit.pos).toEqual(body.pos);
      const speed = Math.hypot(hit.vel.x, hit.vel.y);
      expect(speed).toBeGreaterThan(0.5);
    }
  });
});

describe('자동 슬램 게임의 구역 확률', () => {
  it('던지기 + 자동 슬램 10~20회 후 멈춘 구역이 대체로 균등하다 (n=4)', () => {
    const n = 4;
    const counts = new Array(n).fill(0);
    const GAMES = 600;
    for (let seed = 1; seed <= GAMES; seed++) {
      const rand = lcg(seed * 7919);
      // 컴포넌트와 동일한 시나리오: 랜덤 시작·던지기 → 속도가 SLAM_TRIGGER 아래면 자동 슬램
      let body = {
        pos: { x: 0.35 + rand() * 0.3, y: 0.35 + rand() * 0.3 },
        vel: { x: 0, y: 0 },
      };
      const a = rand() * Math.PI * 2;
      const mag = 1.1 + rand() * 0.6;
      body.vel = { x: Math.cos(a) * mag, y: Math.sin(a) * mag };
      const initial = randSlamCount(rand);
      let slams = initial;
      let nextSlamAt = slamInterval(initial, initial);
      for (let t = 0; t < 90; t += 1 / 60) {
        body = stepBody(body, 1 / 60);
        if (slams > 0 && t >= nextSlamAt) {
          body = slamImpulse(body, rand);
          slams--;
          nextSlamAt = t + slamInterval(slams, initial);
        } else if (slams === 0 && isStopped(body)) {
          break;
        }
      }
      counts[zoneOf(body.pos, n)]++;
    }
    // 균등(25%) 대비 크게 치우치지 않아야 한다
    for (const c of counts) {
      expect(c / GAMES).toBeGreaterThanOrEqual(0.15);
      expect(c / GAMES).toBeLessThanOrEqual(0.35);
    }
  });
});
