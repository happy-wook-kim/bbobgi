import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRaceProfiles, progressAt, speedAt } from '../../engine/race';
import { playerColor } from '../../palette';
import { PlayerName } from '../PlayerName';
import { Burst } from '../Burst';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

// 트랙 전체(벽~결승선)가 항상 화면 안에 보인다 — 다른 게임들과 같은 방식.
const PAD_L = 12; // 출발 벽 위치
const PAD_R = 46; // 결승선 + 순위 뱃지 공간
const HORSE_W = 34;
const RUN_SPAN = `(100% - ${PAD_L + PAD_R + HORSE_W}px)`; // 달리는 구간 폭
const KMH = 360000; // 진행도/ms → km/h 환산(코스 100m 기준) — 평균 속도가 약 45km/h가 된다

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
        {done ? (
          <PlayerName i={winnerIndex}>{items[winnerIndex]}</PlayerName>
        ) : started ? (
          '달리는 중…'
        ) : (
          '출발을 누르세요'
        )}
      </h2>
      <div className="race-track">
        {items.map((name, i) => {
          const progress = progressAt(profiles[i], t);
          const finished = started && t >= profiles[i].finishTime;
          const isLoser = i === winnerIndex;
          // 현재 발동 중인 이벤트 (돌에 걸림 / 부스터)
          const active = profiles[i].events.find((e) => t >= e.t && t <= e.t + e.duration);
          // 컨디션: 자기 평균 대비 15% 이상 빠르면 스퍼트 💨, 15% 이상 느리면 지침 💦
          const spd = speedAt(profiles[i], t);
          const avg = 1 / profiles[i].finishTime;
          const condition = spd >= avg * 1.15 ? 'sprint' : spd <= avg * 0.85 ? 'tired' : 'run';
          const horseState = !started || finished
            ? ''
            : active
              ? active.kind === 'rock'
                ? 'is-stumbling'
                : 'is-boosting'
              : condition === 'sprint'
                ? 'is-sprinting'
                : condition === 'tired'
                  ? 'is-tired'
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
                <i className="race-tag" style={{ color: playerColor(i) }}>
                  {name}
                </i>
                {horseState === 'is-stumbling' && <i className="race-fx">💫</i>}
                {horseState === 'is-boosting' && <i className="race-fx race-fx-boost">🔥</i>}
                {horseState === 'is-sprinting' && <i className="race-fx race-fx-boost">💨</i>}
                {horseState === 'is-tired' && <i className="race-fx">💦</i>}
                <i className="race-glyph">🐎</i>
                {done && isLoser && <Burst />}
              </span>
              <b className={`race-rank ${done && isLoser ? 'is-loser' : ''}`}>
                {finished ? (done && isLoser ? '꼴찌' : `${rankOf[i] + 1}등`) : ''}
              </b>
              {started && !finished && (() => {
                // 속도 수치와 상태 문구를 분리 — 문구는 옆의 색 뱃지로
                const state = active
                  ? active.kind === 'rock'
                    ? { cls: 'is-slow', label: '돌에 걸림!' }
                    : { cls: 'is-fast', label: '부스터!' }
                  : condition === 'sprint'
                    ? { cls: 'is-sprint', label: '스퍼트 중' }
                    : condition === 'tired'
                      ? { cls: 'is-tired', label: '지침…' }
                      : null;
                return (
                  <span className="race-hud">
                    <i className={`race-speed ${state?.cls ?? ''}`}>
                      {Math.round(spd * KMH)} km/h
                    </i>
                    {state && <i className={`race-badge ${state.cls}`}>{state.label}</i>}
                  </span>
                );
              })()}
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
