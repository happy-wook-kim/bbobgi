import { describe, it, expect } from 'vitest';
import {
  zoneRects,
  zoneOf,
  planPath,
  pathPosAt,
  stepBody,
  slamImpulse,
  isStopped,
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

describe('planPath / pathPosAt (확정 모드)', () => {
  it('경로의 시작은 from, 끝은 항상 목표 구역 안이다', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = lcg(seed);
      const n = 2 + (seed % 7);
      const target = seed % n;
      const from = { x: 0.1 + rand() * 0.8, y: 0.1 + rand() * 0.8 };
      const path = planPath(from, target, n, rand);
      const start = pathPosAt(path, 0);
      expect(start.x).toBeCloseTo(from.x, 9);
      expect(start.y).toBeCloseTo(from.y, 9);
      const last = path.pts[path.pts.length - 1];
      const end = pathPosAt(path, last.t + 999);
      expect(zoneOf(end, n)).toBe(target);
    }
  });

  it('슬램(재계획)을 아무리 반복해도 최종 구역은 목표 그대로다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      const n = 4;
      const target = seed % n;
      let pos = { x: 0.5, y: 0.5 };
      let path = planPath(pos, target, n, rand);
      // 무작위 시점에 5번 내려친다
      for (let s = 0; s < 5; s++) {
        const last = path.pts[path.pts.length - 1];
        pos = pathPosAt(path, rand() * last.t);
        path = planPath(pos, target, n, rand);
      }
      const last = path.pts[path.pts.length - 1];
      expect(zoneOf(pathPosAt(path, last.t), n)).toBe(target);
    }
  });
});

describe('stepBody / slamImpulse (물리 모드)', () => {
  it('마찰로 감속해 10초 안에 멈추고 보드 밖으로 나가지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rand = lcg(seed);
      let body = {
        pos: { x: 0.5, y: 0.5 },
        vel: { x: (rand() - 0.5) * 3, y: (rand() - 0.5) * 3 },
      };
      let stopped = false;
      for (let t = 0; t < 10; t += 1 / 60) {
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
