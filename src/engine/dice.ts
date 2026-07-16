export type Vec = { x: number; y: number };
export type DiceBody = { pos: Vec; vel: Vec };

const FRICTION = 1.0; // 지수 마찰(1/s) — 낮을수록 오래, 멀리 굴러간다
const BOUNCE_DAMP = 0.8; // 벽 반사 감쇠
const STOP_EPS = 0.03; // 정지 판정 속도

/** 원형 보드: 중심 (0.5, 0.5), 주사위 중심이 닿는 벽 반지름. */
export const WALL_R = 0.44;

/** 게임 시작 시 자동 슬램 횟수: 10~20 랜덤. */
export function randSlamCount(rand: () => number = Math.random): number {
  return 10 + Math.floor(rand() * 11);
}

const INTERVAL_FAST = 0.14; // 첫 슬램 간격(초) — 빵빵빵 몰아친다
const INTERVAL_RAMP_TO = 0.55; // 6회 남았을 때 간격
const INTERVAL_FINAL = 0.9; // 마지막 5회: 카운트다운 페이스

/**
 * 다음 슬램까지의 간격(초). 초반엔 매우 빠르게 몰아치다 점차 느려지고,
 * 마지막 5회는 5-4-3-2-1 카운트다운처럼 일정한 페이스로 친다.
 */
export function slamInterval(remaining: number, initial: number): number {
  if (remaining <= 5) return INTERVAL_FINAL;
  const span = Math.max(initial - 6, 1);
  const p = (initial - remaining) / span;
  return INTERVAL_FAST + (INTERVAL_RAMP_TO - INTERVAL_FAST) * p;
}

/**
 * 슬램 세기 배율. 카운트다운(남은 5회)부터 점점 세져서 확확 튕기고,
 * 마지막 강타(remaining=0)는 가장 세게 날려 결과를 끝까지 알 수 없게 한다.
 * remaining은 이 슬램 이후 남는 횟수(화면에 표시되는 숫자).
 */
export function slamPower(remaining: number): number {
  if (remaining > 5) return 1;
  return 1.2 + (5 - remaining) * 0.18; // 5→1.2 … 0→2.1
}

/** 부채꼴 i(0-기준, 12시 방향부터 시계 방향)의 중앙각(라디안). */
export function sectorMid(i: number, n: number): number {
  return -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / n;
}

/** 좌표가 속한 부채꼴 인덱스 — 모든 구역은 크기·모양이 같은 합동 분할이다. */
export function zoneOf(pos: Vec, n: number): number {
  const a = Math.atan2(pos.y - 0.5, pos.x - 0.5) + Math.PI / 2; // 12시 = 0
  const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(Math.floor((norm / (Math.PI * 2)) * n), n - 1);
}

/** 지수 마찰 + 원형 벽 반사 한 스텝(dt초). 순수 — 새 객체를 반환한다. */
export function stepBody(body: DiceBody, dt: number): DiceBody {
  let x = body.pos.x + body.vel.x * dt;
  let y = body.pos.y + body.vel.y * dt;
  let vx = body.vel.x;
  let vy = body.vel.y;
  const dx = x - 0.5;
  const dy = y - 0.5;
  const dist = Math.hypot(dx, dy);
  if (dist > WALL_R) {
    // 법선 방향으로 초과분만큼 안쪽에 두고, 속도의 법선 성분을 반전·감쇠
    const nx = dx / dist;
    const ny = dy / dist;
    const inside = 2 * WALL_R - dist;
    x = 0.5 + nx * inside;
    y = 0.5 + ny * inside;
    const vn = vx * nx + vy * ny;
    vx = (vx - 2 * vn * nx) * BOUNCE_DAMP;
    vy = (vy - 2 * vn * ny) * BOUNCE_DAMP;
  }
  const decay = Math.exp(-FRICTION * dt);
  return { pos: { x, y }, vel: { x: vx * decay, y: vy * decay } };
}

/** 슬램 충격: 보드 중앙 쪽으로 튕기는 방향(+랜덤 편차)에 power 배율의 새 속도를 부여한다. */
export function slamImpulse(
  body: DiceBody,
  rand: () => number = Math.random,
  power = 1,
): DiceBody {
  const toCenter = Math.atan2(0.5 - body.pos.y, 0.5 - body.pos.x);
  const a = toCenter + (rand() - 0.5) * 2.4;
  const mag = (1.1 + rand() * 0.6) * power;
  return { pos: body.pos, vel: { x: Math.cos(a) * mag, y: Math.sin(a) * mag } };
}

/** 사실상 멈췄는가. */
export function isStopped(body: DiceBody): boolean {
  return Math.hypot(body.vel.x, body.vel.y) < STOP_EPS;
}
