import { shuffle } from './shuffle';

export type Waypoint = { t: number; x: number };
export type RaceEventKind = 'rock' | 'boost';
export type RaceEvent = { kind: RaceEventKind; t: number; duration: number; x: number };
export type RaceProfile = { finishTime: number; waypoints: Waypoint[]; events: RaceEvent[] };

const FASTEST = 9500; // 1등 도착 목표(ms) — 기본 속도를 느리게, 레이스 약 12초
const SPREAD = 2000; // 1등 ~ 꼴찌 직전까지 도착 시각이 퍼지는 폭
const MARGIN_MIN = 300; // 꼴찌 접전 마진(ms)
const MARGIN_MAX = 800;
const EVENT_FROM = 0.15; // 이벤트 발생 시간대(레이스 시간 비율)
const EVENT_TO = 0.8;
const ROCK_DUR_MIN = 600; // 돌에 걸려 비틀거리는 시간(ms)
const ROCK_DUR_MAX = 900;
const BOOST_DUR_MIN = 650; // 부스터 지속 시간(ms)
const BOOST_DUR_MAX = 850;
const ROCK_WEIGHT = 0.02; // 돌 구간 진행량: 거의 정지
const BOOST_SPEED = 3; // 부스터 구간: 일반 대비 배속
const RUN_CHUNK_MIN = 700; // 일반 구간 분할 단위(ms) — 짧을수록 속도 변화가 잦다
const RUN_CHUNK_MAX = 1300;
// 일반 구간은 느림/빠름 밴드를 번갈아 탄다 — 뒤처진 말이 다음 구간에 다시 치고 나오는 고무줄 리듬
const SLOW_MIN = 0.55;
const SLOW_MAX = 0.9;
const FAST_MIN = 1.15;
const FAST_MAX = 1.5;
const EVENT_COUNT = 3; // 레인당 아이템 수

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

  // 타임라인을 [일반/이벤트] 구간으로 나누고 구간별 진행량을 배분한 뒤 0~1로 정규화한다.
  const buildFor = (finishTime: number): { waypoints: Waypoint[]; events: RaceEvent[] } => {
    // 1) 이벤트 배치: 슬롯 분할로 겹침 없이 15%~80% 시간대에
    const count = EVENT_COUNT;
    const evs: { kind: RaceEventKind; t: number; duration: number }[] = [];
    const from = EVENT_FROM * finishTime;
    const span = (EVENT_TO - EVENT_FROM) * finishTime;
    for (let k = 0; k < count; k++) {
      const kind: RaceEventKind = rand() < 0.5 ? 'rock' : 'boost';
      const [dMin, dMax] = kind === 'rock' ? [ROCK_DUR_MIN, ROCK_DUR_MAX] : [BOOST_DUR_MIN, BOOST_DUR_MAX];
      const duration = dMin + rand() * (dMax - dMin);
      const slot = span / count;
      const t = from + k * slot + rand() * Math.max(slot - duration, 0);
      evs.push({ kind, t, duration });
    }

    // 2) 구간 경계 구성 (ev: evs 인덱스, 없으면 일반 구간)
    type Seg = { from: number; to: number; ev?: number };
    const bounds: Seg[] = [];
    let cursor = 0;
    evs.forEach((e, k) => {
      if (e.t > cursor) bounds.push({ from: cursor, to: e.t });
      bounds.push({ from: e.t, to: e.t + e.duration, ev: k });
      cursor = e.t + e.duration;
    });
    bounds.push({ from: cursor, to: finishTime });
    // 일반 구간을 0.7~1.3초 단위로 잘게 나눠 속도 변화(치고 나가기·처지기)를 만든다
    const parts: Seg[] = [];
    for (const s of bounds) {
      if (s.ev !== undefined) {
        parts.push(s);
        continue;
      }
      let segFrom = s.from;
      while (s.to - segFrom > RUN_CHUNK_MAX) {
        const cut = segFrom + RUN_CHUNK_MIN + rand() * (RUN_CHUNK_MAX - RUN_CHUNK_MIN);
        parts.push({ from: segFrom, to: cut });
        segFrom = cut;
      }
      parts.push({ from: segFrom, to: s.to });
    }

    // 3) 구간별 진행량 → 4) 누적 정규화
    let fast = rand() < 0.5; // 말마다 시작 밴드가 달라 서로 엇갈리며 역전이 생긴다
    const weights = parts.map((s) => {
      if (s.ev !== undefined && evs[s.ev].kind === 'rock') return ROCK_WEIGHT;
      if (s.ev !== undefined) return (s.to - s.from) * BOOST_SPEED;
      const [lo, hi] = fast ? [FAST_MIN, FAST_MAX] : [SLOW_MIN, SLOW_MAX];
      fast = !fast;
      return (s.to - s.from) * (lo + rand() * (hi - lo));
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const waypoints: Waypoint[] = [{ t: 0, x: 0 }];
    const events: RaceEvent[] = [];
    let cum = 0;
    parts.forEach((s, i) => {
      if (s.ev !== undefined) {
        const e = evs[s.ev];
        events.push({ kind: e.kind, t: e.t, duration: e.duration, x: cum / total });
      }
      cum += weights[i];
      waypoints.push({ t: s.to, x: cum / total });
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
