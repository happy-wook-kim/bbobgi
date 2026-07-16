import { describe, it, expect } from 'vitest';
import {
  sectorMid,
  zoneOf,
  stepBody,
  slamImpulse,
  slamPower,
  isStopped,
  randSlamCount,
  slamInterval,
  WALL_R,
} from './dice';

/** 결정적 테스트용 LCG */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('부채꼴 구역 (zoneOf / sectorMid)', () => {
  it('각 부채꼴의 중앙각 지점은 자기 인덱스로 판정된다', () => {
    for (let n = 2; n <= 12; n++) {
      for (let i = 0; i < n; i++) {
        const mid = sectorMid(i, n);
        for (const r of [0.1, 0.25, 0.4]) {
          const p = { x: 0.5 + Math.cos(mid) * r, y: 0.5 + Math.sin(mid) * r };
          expect(zoneOf(p, n)).toBe(i);
        }
      }
    }
  });

  it('점을 한 부채꼴 각도만큼 돌리면 구역 인덱스가 1씩 증가한다 (합동 분할)', () => {
    for (let n = 2; n <= 12; n++) {
      const step = (Math.PI * 2) / n;
      const rand = lcg(n);
      for (let k = 0; k < 20; k++) {
        const a = rand() * Math.PI * 2;
        const r = 0.05 + rand() * 0.38;
        const z0 = zoneOf({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r }, n);
        const z1 = zoneOf({ x: 0.5 + Math.cos(a + step) * r, y: 0.5 + Math.sin(a + step) * r }, n);
        expect(z1).toBe((z0 + 1) % n);
      }
    }
  });
});

describe('randSlamCount / slamInterval / slamPower', () => {
  it('슬램 횟수는 10~20 사이의 정수다', () => {
    expect(randSlamCount(() => 0)).toBe(10);
    expect(randSlamCount(() => 0.999)).toBe(20);
  });

  it('간격은 초반 빠르고(≤0.2s) 점차 느려지다 마지막 5회는 0.9s다', () => {
    const initial = 20;
    expect(slamInterval(initial, initial)).toBeLessThanOrEqual(0.2);
    let prev = 0;
    for (let remaining = initial; remaining > 5; remaining--) {
      const iv = slamInterval(remaining, initial);
      expect(iv).toBeGreaterThanOrEqual(prev);
      prev = iv;
    }
    for (let remaining = 5; remaining >= 1; remaining--) {
      expect(slamInterval(remaining, initial)).toBeCloseTo(0.9, 9);
    }
  });

  it('카운트다운(5회)부터 강타 — 남을수록 세지고 마지막이 가장 세다', () => {
    expect(slamPower(6)).toBe(1);
    expect(slamPower(20)).toBe(1);
    let prev = 1;
    for (let remaining = 5; remaining >= 0; remaining--) {
      const p = slamPower(remaining);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    expect(slamPower(0)).toBeGreaterThanOrEqual(2); // 마지막 강타: 결과를 알 수 없게 크게 튕긴다
  });
});

describe('stepBody / slamImpulse (원형 벽)', () => {
  it('마찰로 감속해 20초 안에 멈추고 원형 벽(반지름) 밖으로 나가지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      let body = {
        pos: { x: 0.5, y: 0.5 },
        vel: { x: (rand() - 0.5) * 6, y: (rand() - 0.5) * 6 },
      };
      let stopped = false;
      for (let t = 0; t < 20; t += 1 / 60) {
        body = stepBody(body, 1 / 60);
        const dist = Math.hypot(body.pos.x - 0.5, body.pos.y - 0.5);
        expect(dist).toBeLessThanOrEqual(WALL_R + 1e-9);
        if (isStopped(body)) {
          stopped = true;
          break;
        }
      }
      expect(stopped).toBe(true);
    }
  });

  it('슬램은 위치를 바꾸지 않고 속도를 키우며, power에 비례한다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      const body = { pos: { x: 0.3, y: 0.6 }, vel: { x: 0.01, y: 0 } };
      const hit = slamImpulse(body, rand);
      expect(hit.pos).toEqual(body.pos);
      expect(Math.hypot(hit.vel.x, hit.vel.y)).toBeGreaterThan(0.5);
    }
    // 같은 rand 시퀀스에서 power 2배 → 속도 2배
    const mk = () => lcg(42);
    const base = slamImpulse({ pos: { x: 0.5, y: 0.5 }, vel: { x: 0, y: 0 } }, mk(), 1);
    const strong = slamImpulse({ pos: { x: 0.5, y: 0.5 }, vel: { x: 0, y: 0 } }, mk(), 2);
    expect(Math.hypot(strong.vel.x, strong.vel.y)).toBeCloseTo(
      Math.hypot(base.vel.x, base.vel.y) * 2,
      9,
    );
  });
});

describe('자동 슬램 게임의 구역 확률 (원형)', () => {
  it('던지기 + 자동 슬램(강타 포함) 후 멈춘 부채꼴이 대체로 균등하다 (n=5)', () => {
    const n = 5;
    const counts = new Array(n).fill(0);
    const GAMES = 600;
    for (let seed = 1; seed <= GAMES; seed++) {
      const rand = lcg(seed * 7919);
      let body = {
        pos: { x: 0.4 + rand() * 0.2, y: 0.4 + rand() * 0.2 },
        vel: { x: 0, y: 0 },
      };
      const a = rand() * Math.PI * 2;
      const mag = 1.1 + rand() * 0.6;
      body.vel = { x: Math.cos(a) * mag, y: Math.sin(a) * mag };
      const initial = randSlamCount(rand);
      let slams = initial;
      let nextSlamAt = slamInterval(initial, initial);
      for (let t = 0; t < 120; t += 1 / 60) {
        body = stepBody(body, 1 / 60);
        if (slams > 0 && t >= nextSlamAt) {
          slams--;
          body = slamImpulse(body, rand, slamPower(slams));
          nextSlamAt = t + slamInterval(slams, initial);
        } else if (slams === 0 && isStopped(body)) {
          break;
        }
      }
      counts[zoneOf(body.pos, n)]++;
    }
    // 균등(20%) 대비 크게 치우치지 않아야 한다
    for (const c of counts) {
      expect(c / GAMES).toBeGreaterThanOrEqual(0.12);
      expect(c / GAMES).toBeLessThanOrEqual(0.28);
    }
  });
});
