import { shuffle } from './shuffle';

export type Waypoint = { t: number; x: number };
export type RaceEventKind = 'rock' | 'boost';
export type RaceEvent = { kind: RaceEventKind; t: number; duration: number; x: number };
export type RaceProfile = { finishTime: number; waypoints: Waypoint[]; events: RaceEvent[] };

const FASTEST = 9500; // 1등 도착 목표(ms) — 기본 속도를 느리게, 레이스 약 12초
const SPREAD = 2000; // 1등 ~ 꼴찌 직전까지 도착 시각이 퍼지는 폭
const MARGIN_MIN = 300; // 꼴찌 접전 마진(ms)
const MARGIN_MAX = 800;
const ROCK_DX = 0.002; // 돌 구간 이동량: 거의 정지
const ROCK_STALL_MIN = 0.055; // 돌에 걸려 서 있는 시간(레이스 시간 대비 비율 ≈ 0.6~1초)
const ROCK_STALL_MAX = 0.085;
const BOOST_SPEED = 3; // 부스터 구간: 일반 대비 배속
const BOOST_DX_MIN = 0.06; // 부스터로 내달리는 거리(진행도)
const BOOST_DX_MAX = 0.1;
// 일반 구간은 느림/빠름 밴드를 번갈아 탄다 — 뒤처진 말이 다음 구간에 다시 치고 나오는 고무줄 리듬
const SLOW_MIN = 0.55;
const SLOW_MAX = 0.9;
const FAST_MIN = 1.15;
const FAST_MAX = 1.5;
const EVENT_COUNT = 3; // 레인당 아이템 수 — 트랙 1/4·2/4·3/4 지점에 일정 간격 배치

/**
 * 말별 도착 시각·중간 제어점·이벤트(돌/부스터)를 생성한다. loserIndex 말이 항상 마지막에 도착한다.
 * 이벤트는 finishTime을 바꾸지 않고 구간 속도만 재분배하므로 결과(꼴찌)에 영향이 없다.
 */
export function buildRaceProfiles(
  n: number,
  loserIndex: number,
  rand: () => number = Math.random,
): RaceProfile[] {
  const others = n - 1;
  const times: number[] = [];
  for (let k = 0; k < others; k++) {
    const base = others === 1 ? 0 : (k * SPREAD) / (others - 1);
    times.push(FASTEST + base + rand() * 200);
  }
  const assigned = shuffle(times, rand); // 꼴찌 제외 도착 순서를 무작위 배정
  const loserTime = Math.max(...times) + MARGIN_MIN + rand() * (MARGIN_MAX - MARGIN_MIN);

  // 트랙을 위치 기준 조각으로 구성한다: 아이템은 진행도 1/4·2/4·3/4 지점 고정(일정 간격),
  // 각 조각의 상대 시간을 계산한 뒤 총합이 finishTime이 되도록 정규화한다.
  const buildFor = (finishTime: number): { waypoints: Waypoint[]; events: RaceEvent[] } => {
    // 1) 아이템: 위치는 일정 간격, 종류만 랜덤
    const evs = Array.from({ length: EVENT_COUNT }, (_, k) => ({
      kind: (rand() < 0.5 ? 'rock' : 'boost') as RaceEventKind,
      x: (k + 1) / (EVENT_COUNT + 1),
    }));

    // 2) (끝위치, 상대시간) 조각 나열 — rawT 단위는 마지막에 λ로 일괄 환산
    type Piece = { endX: number; rawT: number; ev?: number };
    const pieces: Piece[] = [];
    let cursor = 0; // 현재 진행도
    let fast = rand() < 0.5; // 말마다 시작 밴드가 달라 서로 엇갈리며 역전이 생긴다
    const pushRun = (toX: number) => {
      const gap = toX - cursor;
      if (gap <= 0) return;
      const split = cursor + gap * (0.35 + rand() * 0.3); // 한 구간을 둘로 나눠 밴드 교대
      for (const endX of [split, toX]) {
        const dx = endX - cursor;
        const [lo, hi] = fast ? [FAST_MIN, FAST_MAX] : [SLOW_MIN, SLOW_MAX];
        fast = !fast;
        pieces.push({ endX, rawT: dx / (lo + rand() * (hi - lo)) });
        cursor = endX;
      }
    };
    evs.forEach((e, k) => {
      pushRun(e.x);
      if (e.kind === 'rock') {
        // 제자리에 서서 rawT만큼 시간을 흘려보낸다 (일반 조각의 rawT ≈ dx 스케일)
        pieces.push({ endX: e.x + ROCK_DX, rawT: ROCK_STALL_MIN + rand() * (ROCK_STALL_MAX - ROCK_STALL_MIN), ev: k });
        cursor = e.x + ROCK_DX;
      } else {
        const dx = BOOST_DX_MIN + rand() * (BOOST_DX_MAX - BOOST_DX_MIN);
        pieces.push({ endX: e.x + dx, rawT: dx / BOOST_SPEED, ev: k });
        cursor = e.x + dx;
      }
    });
    pushRun(1);

    // 3) 상대시간 → 실제 시간 정규화, 제어점·이벤트 확정
    const totalRaw = pieces.reduce((a, p) => a + p.rawT, 0);
    const waypoints: Waypoint[] = [{ t: 0, x: 0 }];
    const events: RaceEvent[] = [];
    let cumRaw = 0;
    pieces.forEach((p) => {
      const tStart = (cumRaw / totalRaw) * finishTime;
      cumRaw += p.rawT;
      const tEnd = (cumRaw / totalRaw) * finishTime;
      if (p.ev !== undefined) {
        events.push({ kind: evs[p.ev].kind, t: tStart, duration: tEnd - tStart, x: evs[p.ev].x });
      }
      waypoints.push({ t: tEnd, x: p.endX });
    });
    return { waypoints, events };
  };

  let cursor = 0;
  return Array.from({ length: n }, (_, i) => {
    const finishTime = i === loserIndex ? loserTime : assigned[cursor++];
    return { finishTime, ...buildFor(finishTime) };
  });
}

/** 시각 t(ms)의 순간 속도(진행도/ms). 달리는 중엔 구간 기울기, 도착 후엔 0. */
export function speedAt(profile: RaceProfile, t: number): number {
  const pts = profile.waypoints;
  if (t < 0 || t >= profile.finishTime) return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= b.t) return (b.x - a.x) / (b.t - a.t);
  }
  return 0;
}

/** 시각 t(ms)의 진행도(0~1). 제어점 사이 선형 보간, 단조 증가. */
export function progressAt(profile: RaceProfile, t: number): number {
  const pts = profile.waypoints;
  if (t <= 0) return 0;
  if (t >= profile.finishTime) return 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return a.x + (b.x - a.x) * u;
    }
  }
  return 1;
}
