import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRaceProfiles, progressAt } from '../../engine/race';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

const HORSE_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1',
  '#c2185b', '#fbc02d', '#5e35b1', '#00897b', '#d81b60', '#3949ab',
];

// 트랙 전체(벽~결승선)가 항상 화면 안에 보인다 — 다른 게임들과 같은 방식.
const PAD_L = 12; // 출발 벽 위치
const PAD_R = 46; // 결승선 + 순위 뱃지 공간
const HORSE_W = 34;
const RUN_SPAN = `(100% - ${PAD_L + PAD_R + HORSE_W}px)`; // 달리는 구간 폭

export function HorseRace({ items, winnerIndex, onWin }: Props) {
  const n = items.length;
  // winnerIndex(걸린 사람) 말이 꼴찌가 되도록 궤적을 생성한다.
  const profiles = useMemo(() => buildRaceProfiles(n, winnerIndex), [n, winnerIndex]);
  // 도착 시각 오름차순 → 순위(0=1등). 꼴찌는 항상 마지막.
  const rankOf = useMemo(() => {
    const order = profiles
      .map((_, i) => i)
      .sort((a, b) => profiles[a].finishTime - profiles[b].finishTime);
    const r = new Array<number>(n);
    order.forEach((horse, rank) => {
      r[horse] = rank;
    });
    return r;
  }, [profiles, n]);

  const [t, setT] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef(0);
  const wonRef = useRef(0);
  const endTime = profiles[winnerIndex].finishTime; // 꼴찌 도착 = 레이스 종료

  const start = () => {
    if (started) return;
    setStarted(true);
    const t0 = performance.now();
    const step = (now: number) => {
      const tt = now - t0;
      if (tt >= endTime) {
        setT(endTime);
        setDone(true);
        // 꼴찌를 눈으로 확인할 여유를 두고 결과를 알린다.
        wonRef.current = window.setTimeout(() => onWin(winnerIndex), 900);
      } else {
        setT(tt);
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(wonRef.current);
    },
    [],
  );

  return (
    <div className="screen race">
      <p className="eyebrow">경마</p>
      <h2 className="stage-title">
        {done ? items[winnerIndex] : started ? '달리는 중…' : '출발을 누르세요'}
      </h2>
      <div className="race-track">
        {items.map((name, i) => {
          const progress = progressAt(profiles[i], t);
          const finished = started && t >= profiles[i].finishTime;
          const isLoser = i === winnerIndex;
          // 현재 발동 중인 이벤트 (돌에 걸림 / 부스터)
          const active = profiles[i].events.find((e) => t >= e.t && t <= e.t + e.duration);
          const horseState = !started || finished
            ? ''
            : active
              ? active.kind === 'rock'
                ? 'is-stumbling'
                : 'is-boosting'
              : 'is-running';
          return (
            <div key={i} className={`race-lane ${done && isLoser ? 'is-loser' : ''}`}>
              {profiles[i].events.map((e, k) => {
                // 밟기 전엔 ❓로 정체를 숨긴다. 밟는 순간 공개 — 돌은 남고, 부스터는 소모 후 사라진다.
                const revealed = t >= e.t;
                if (revealed && e.kind === 'boost' && t > e.t + e.duration) return null;
                return (
                  <span
                    key={k}
                    className="race-item"
                    style={{ left: `calc(${PAD_L + HORSE_W - 6}px + ${RUN_SPAN} * ${e.x.toFixed(4)})` }}
                    aria-hidden
                  >
                    {revealed ? (e.kind === 'rock' ? '🪨' : '⚡') : '❓'}
                  </span>
                );
              })}
              <span
                className={`race-horse ${horseState}`}
                style={{ left: `calc(${PAD_L}px + ${RUN_SPAN} * ${progress.toFixed(4)})` }}
                aria-hidden
              >
                <i className="race-tag" style={{ color: HORSE_COLORS[i % HORSE_COLORS.length] }}>
                  {name}
                </i>
                {active?.kind === 'rock' && <i className="race-fx">💫</i>}
                {active?.kind === 'boost' && <i className="race-fx race-fx-boost">🔥</i>}
                <i className="race-glyph">🐎</i>
              </span>
              <b className={`race-rank ${done && isLoser ? 'is-loser' : ''}`}>
                {finished ? (done && isLoser ? '꼴찌' : `${rankOf[i] + 1}등`) : ''}
              </b>
            </div>
          );
        })}
        {/* 레인(꼴찌 강조 배경)보다 뒤에 그려 선이 가려지지 않게 한다 */}
        <span className="race-wall" aria-hidden />
        <span className="race-finish" aria-hidden />
      </div>
      <button
        className="btn-primary"
        onClick={start}
        disabled={started}
        style={{ visibility: started ? 'hidden' : 'visible' }}
      >
        출발
      </button>
    </div>
  );
}
