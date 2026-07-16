export type Vec = { x: number; y: number };
export type ZoneRect = { x: number; y: number; w: number; h: number };
export type DiceBody = { pos: Vec; vel: Vec };

const PAD = 0.06; // 주사위가 벽에 붙지 않는 여유
const FRICTION = 1.0; // 지수 마찰(1/s) — 낮을수록 오래, 멀리 굴러간다
const BOUNCE_DAMP = 0.8; // 벽 반사 감쇠
const STOP_EPS = 0.03; // 정지 판정 속도

/** 이 속도 아래로 떨어지면 자동 슬램이 발동한다. */
export const SLAM_TRIGGER = 0.55;

/** 게임 시작 시 자동 슬램 횟수: 10~20 랜덤. */
export function randSlamCount(rand: () => number = Math.random): number {
  return 10 + Math.floor(rand() * 11);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

/** 지수 마찰 + 벽 반사 한 스텝(dt초). 순수 — 새 객체를 반환한다. */
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
  const mag = 1.1 + rand() * 0.6;
  return { pos: body.pos, vel: { x: Math.cos(a) * mag, y: Math.sin(a) * mag } };
}

/** 사실상 멈췄는가. */
export function isStopped(body: DiceBody): boolean {
  return Math.hypot(body.vel.x, body.vel.y) < STOP_EPS;
}
