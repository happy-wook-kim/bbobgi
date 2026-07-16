export type Vec = { x: number; y: number };
export type ZoneRect = { x: number; y: number; w: number; h: number };
export type DicePath = { pts: { t: number; x: number; y: number }[] };
export type DiceBody = { pos: Vec; vel: Vec };

const PAD = 0.06; // 주사위가 벽에 붙지 않는 여유
const FRICTION = 1.4; // 지수 마찰(1/s)
const BOUNCE_DAMP = 0.8; // 벽 반사 감쇠
const STOP_EPS = 0.03; // 정지 판정 속도
const ZONE_MARGIN = 0.15; // 확정 모드 목표점의 구역 가장자리 여유(비율)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampPt = (p: Vec): Vec => ({ x: clamp(p.x, PAD, 1 - PAD), y: clamp(p.y, PAD, 1 - PAD) });

/** 행별 셀 수(±1)와 높이(셀 수 비례)를 계산한다. 모든 구역 면적 = 1/n. */
function rowsOf(n: number): { count: number; y: number; h: number; startIdx: number }[] {
  const cols = Math.ceil(Math.sqrt(n));
  const rowCount = Math.ceil(n / cols);
  const base = Math.floor(n / rowCount);
  const extra = n % rowCount;
  const rows: { count: number; y: number; h: number; startIdx: number }[] = [];
  let y = 0;
  let idx = 0;
  for (let r = 0; r < rowCount; r++) {
    const count = base + (r < extra ? 1 : 0);
    const h = count / n; // 면적 균등: (1/count) * (count/n) = 1/n
    rows.push({ count, y, h, startIdx: idx });
    y += h;
    idx += count;
  }
  return rows;
}

/** 참가자 구역 격자. index = 참가자 인덱스, 면적은 전부 1/n. */
export function zoneRects(n: number): ZoneRect[] {
  const rects: ZoneRect[] = [];
  for (const row of rowsOf(n)) {
    for (let c = 0; c < row.count; c++) {
      rects.push({ x: c / row.count, y: row.y, w: 1 / row.count, h: row.h });
    }
  }
  return rects;
}

/** 좌표가 속한 구역 인덱스. */
export function zoneOf(pos: Vec, n: number): number {
  const x = clamp(pos.x, 0, 1 - 1e-9);
  const y = clamp(pos.y, 0, 1 - 1e-9);
  for (const row of rowsOf(n)) {
    if (y < row.y + row.h) {
      return row.startIdx + Math.min(Math.floor(x * row.count), row.count - 1);
    }
  }
  const last = rowsOf(n).at(-1)!;
  return last.startIdx + Math.min(Math.floor(x * last.count), last.count - 1);
}

/**
 * 🎯 확정 모드: 현재 위치에서 목표 구역 안 랜덤 지점까지, 킥(반동)→드리프트→감속 정지 경로를 계획한다.
 * 슬램 = 현재 위치에서 같은 목표로 재계획 → 몇 번을 치든 최종 구역은 바뀌지 않는다.
 */
export function planPath(
  from: Vec,
  targetZone: number,
  n: number,
  rand: () => number = Math.random,
): DicePath {
  const r = zoneRects(n)[targetZone];
  const target = clampPt({
    x: r.x + r.w * (ZONE_MARGIN + rand() * (1 - 2 * ZONE_MARGIN)),
    y: r.y + r.h * (ZONE_MARGIN + rand() * (1 - 2 * ZONE_MARGIN)),
  });
  // 킥: 슬램 반동으로 튀는 짧고 빠른 직진
  const a = rand() * Math.PI * 2;
  const len = 0.18 + rand() * 0.22;
  const kick = clampPt({ x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len });
  // 드리프트: 목표 쪽으로 굽어 가는 중간점
  const u = 0.45 + rand() * 0.2;
  const px = target.y - kick.y; // 수직 방향 지터
  const py = kick.x - target.x;
  const jitter = (rand() - 0.5) * 0.16;
  const mid = clampPt({
    x: kick.x + (target.x - kick.x) * u + px * jitter,
    y: kick.y + (target.y - kick.y) * u + py * jitter,
  });
  return {
    pts: [
      { t: 0, x: from.x, y: from.y },
      { t: 0.32, x: kick.x, y: kick.y },
      { t: 0.85, x: mid.x, y: mid.y },
      { t: 1.75 + rand() * 0.5, x: target.x, y: target.y },
    ],
  };
}

/** 경로 위 시각 t(초)의 위치. 구간마다 ease-out — 슬램 직후 빠르고 점점 느려진다. */
export function pathPosAt(path: DicePath, t: number): Vec {
  const pts = path.pts;
  if (t <= 0) return { x: pts[0].x, y: pts[0].y };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      const e = i === pts.length - 2 ? 1 - Math.pow(1 - u, 3) : 1 - Math.pow(1 - u, 2);
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

/** 🌪 물리 모드: 지수 마찰 + 벽 반사 한 스텝(dt초). 순수 — 새 객체를 반환한다. */
export function stepBody(body: DiceBody, dt: number): DiceBody {
  let x = body.pos.x + body.vel.x * dt;
  let y = body.pos.y + body.vel.y * dt;
  let vx = body.vel.x;
  let vy = body.vel.y;
  if (x < PAD) {
    x = PAD + (PAD - x);
    vx = -vx * BOUNCE_DAMP;
  } else if (x > 1 - PAD) {
    x = 1 - PAD - (x - (1 - PAD));
    vx = -vx * BOUNCE_DAMP;
  }
  if (y < PAD) {
    y = PAD + (PAD - y);
    vy = -vy * BOUNCE_DAMP;
  } else if (y > 1 - PAD) {
    y = 1 - PAD - (y - (1 - PAD));
    vy = -vy * BOUNCE_DAMP;
  }
  const decay = Math.exp(-FRICTION * dt);
  return { pos: { x, y }, vel: { x: vx * decay, y: vy * decay } };
}

/** 슬램 충격: 보드 중앙 쪽으로 튕기는 방향(+랜덤 편차)에 새 속도를 부여한다. 위치 불변. */
export function slamImpulse(body: DiceBody, rand: () => number = Math.random): DiceBody {
  const toCenter = Math.atan2(0.5 - body.pos.y, 0.5 - body.pos.x);
  const a = toCenter + (rand() - 0.5) * 2.4;
  const mag = 0.9 + rand() * 0.6;
  return { pos: body.pos, vel: { x: Math.cos(a) * mag, y: Math.sin(a) * mag } };
}

/** 사실상 멈췄는가. */
export function isStopped(body: DiceBody): boolean {
  return Math.hypot(body.vel.x, body.vel.y) < STOP_EPS;
}
