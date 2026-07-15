import { shuffle } from './shuffle';

export type Waypoint = { t: number; x: number };
export type RaceEventKind = 'rock' | 'boost';
export type RaceEvent = { kind: RaceEventKind; t: number; duration: number; x: number };
export type RaceProfile = { finishTime: number; waypoints: Waypoint[]; events: RaceEvent[] };

const FASTEST = 9500; // 1등 도착 목표(ms) — 기본 속도를 느리게, 레이스 약 12초
const SPREAD = 500; // 1등 ~ 꼴찌 직전까지 도착 시각이 퍼지는 폭 — 좁을수록 팩이 붙어 달려 역전이 잦다
const MARGIN_MIN = 300; // 꼴찌 접전 마진(ms)
const MARGIN_MAX = 800;
const ROCK_DX = 0.002; // 돌 구간 이동량: 거의 정지
// 이벤트는 절대 시간 고정 — 남는 시간은 일반 구간이 흡수(스케일)하므로 finishTime은 불변
const ROCK_MS_MIN = 350; // 돌에 걸려 서 있는 시간(ms)
const ROCK_MS_MAX = 550;
const BOOST_MS_MIN = 1000; // 부스터 지속 시간(ms) — 끊기지 않고 최소 1초 유지
const BOOST_MS_MAX = 1200;
const BOOST_DX_MIN = 0.18; // 부스터로 내달리는 거리(진행도) — 다음 아이템(간격 0.25)을 넘지 않게
const BOOST_DX_MAX = 0.21;
const MS_TO_RAW = 1 / 10000; // 절대 시간을 편차 추적용 raw 단위로 환산(레이스 ≈ 10초 기준)
// 일반 구간은 느림/빠름 밴드를 번갈아 탄다 — 뒤처진 말이 다음 구간에 다시 치고 나오는 고무줄 리듬
// 대비를 크게 잡아 엎치락뒤치락이 극적으로 보이게 한다
const SLOW_MIN = 0.4;
const SLOW_MAX = 0.7;
const FAST_MIN = 1.45;
const FAST_MAX = 1.9;
const RUN_SPLITS = 4; // 아이템 사이 일반 구간을 나누는 조각 수 — 많을수록 순위가 자주 뒤집힌다
const DEV_BAND = 0.02; // 평균 페이스 대비 허용 편차(레이스 시간 비율) — 벗어나면 강제 만회/숨 고르기
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
    type Piece = { endX: number; rawT: number; absMs?: number; ev?: number };
    const pieces: Piece[] = [];
    let cursor = 0; // 현재 진행도
    let rawSum = 0; // 지금까지 쓴 상대 시간 — 기준선(cursor)과의 차이가 페이스 편차
    // 편차 기반 밴드 선택: 뒤처지면 만회 질주, 앞서면 숨 고르기, 근처면 랜덤.
    // (기계적 교대는 말끼리 진동 위상이 겹쳐 순위가 굳는다 — 랜덤+고무줄로 위상을 푼다)
    // 이벤트 직후처럼 편차가 아주 클 땐 강수 밴드로 빠르게 복귀시켜 독주를 끊는다.
    const bandFor = (): [number, number] => {
      const dev = rawSum - cursor;
      if (dev > DEV_BAND * 2.5) return [1.9, 2.3];
      if (dev < -DEV_BAND * 2.5) return [0.3, 0.45];
      if (dev > DEV_BAND) return [FAST_MIN, FAST_MAX];
      if (dev < -DEV_BAND) return [SLOW_MIN, SLOW_MAX];
      return rand() < 0.5 ? [FAST_MIN, FAST_MAX] : [SLOW_MIN, SLOW_MAX];
    };
    const pushRun = (toX: number) => {
      const gap = toX - cursor;
      if (gap <= 0) return;
      const cuts: number[] = [];
      for (let c = 1; c < RUN_SPLITS; c++) {
        cuts.push(cursor + gap * ((c + (rand() - 0.5) * 0.5) / RUN_SPLITS));
      }
      for (const endX of [...cuts, toX]) {
        const dx = endX - cursor;
        const [lo, hi] = bandFor();
        const rawT = dx / (lo + rand() * (hi - lo));
        pieces.push({ endX, rawT });
        rawSum += rawT;
        cursor = endX;
      }
    };
    evs.forEach((e, k) => {
      pushRun(e.x);
      if (e.kind === 'rock') {
        // 제자리에 서서 absMs만큼 시간을 흘려보낸다
        const absMs = ROCK_MS_MIN + rand() * (ROCK_MS_MAX - ROCK_MS_MIN);
        pieces.push({ endX: e.x + ROCK_DX, rawT: 0, absMs, ev: k });
        rawSum += absMs * MS_TO_RAW; // 편차가 커지므로 다음 조각들이 자동으로 만회 질주한다
        cursor = e.x + ROCK_DX;
      } else {
        const absMs = BOOST_MS_MIN + rand() * (BOOST_MS_MAX - BOOST_MS_MIN);
        const dx = BOOST_DX_MIN + rand() * (BOOST_DX_MAX - BOOST_DX_MIN);
        pieces.push({ endX: e.x + dx, rawT: 0, absMs, ev: k });
        rawSum += absMs * MS_TO_RAW; // 시간 대비 크게 전진했으므로(dev<0) 다음 조각들이 숨 고르기를 한다
        cursor = e.x + dx;
      }
    });
    pushRun(1);

    // 3) 이벤트는 절대 시간 그대로, 일반 조각이 남은 시간을 나눠 갖도록 스케일
    const runRaw = pieces.reduce((a, p) => a + (p.absMs === undefined ? p.rawT : 0), 0);
    const evMs = pieces.reduce((a, p) => a + (p.absMs ?? 0), 0);
    const scale = (finishTime - evMs) / runRaw;
    const waypoints: Waypoint[] = [{ t: 0, x: 0 }];
    const events: RaceEvent[] = [];
    let tCur = 0;
    pieces.forEach((p, idx) => {
      const dt = p.absMs !== undefined ? p.absMs : p.rawT * scale;
      const tStart = tCur;
      // 마지막 조각(항상 일반 구간)은 finishTime에 정확히 붙인다 — 부동소수 누적 오차 방지
      tCur = idx === pieces.length - 1 ? finishTime : tCur + dt;
      if (p.ev !== undefined) {
        events.push({ kind: evs[p.ev].kind, t: tStart, duration: dt, x: evs[p.ev].x });
      }
      waypoints.push({ t: tCur, x: p.endX });
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
