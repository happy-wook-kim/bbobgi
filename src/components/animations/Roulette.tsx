import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerName } from '../PlayerName';

type Props = {
  items: string[];
  onWin: (index: number) => void;
};

// 빨주노초파남보
const RAINBOW = ['#e53935', '#f57c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa'];

/** n등분 원판 배경을 무지개 색으로 칠한다. 조각 i의 중앙이 12시 기준 i*(360/n)도. */
function conicBackground(n: number): string {
  const slice = 100 / n;
  const stops = Array.from({ length: n }, (_, i) => {
    return `${RAINBOW[i % RAINBOW.length]} ${i * slice}% ${(i + 1) * slice}%`;
  });
  return `conic-gradient(from ${-180 / n}deg, ${stops.join(', ')})`;
}

/** 느리게 시작 → 빨라짐 → 느리게 멈춤. 손으로 돌리는 느낌. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function Roulette({ items, onWin }: Props) {
  const n = items.length;
  const sliceAngle = 360 / n;
  const background = useMemo(() => conicBackground(n), [n]);

  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(-1);
  const rafRef = useRef(0);
  const wonRef = useRef(0);

  const pointerIndex = (rot: number) => ((Math.round(-rot / sliceAngle) % n) + n) % n;

  const land = (rot: number) => {
    const i = pointerIndex(rot);
    setLanded(i);
    setSpinning(false);
    // 멈춘 자리를 눈으로 확인할 여유를 두고 결과를 알린다.
    wonRef.current = window.setTimeout(() => onWin(i), 900);
  };

  const runPhase = (fromR: number, toR: number, dur: number, onEnd: () => void) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const rot = fromR + easeInOut(t) * (toR - fromR);
      setRotation(rot);
      setCurrent(pointerIndex(rot));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setRotation(toR);
        setCurrent(pointerIndex(toR));
        onEnd();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const spin = () => {
    if (spinning || landed >= 0) return;
    setSpinning(true);

    const from = rotation;
    const turns = 5 + Math.floor(Math.random() * 5);
    const fakeTarget = (Math.floor(from / 360) + turns) * 360 + Math.random() * 360;

    // 보너스 0~2회. 각 회마다 정/역 방향·크기 랜덤.
    const bonusCount = Math.floor(Math.random() * 3);
    const stops: number[] = [];
    let pos = fakeTarget;
    for (let k = 0; k < bonusCount; k++) {
      const forward = Math.random() < 0.5;
      const mag = sliceAngle * (0.8 + Math.pow(Math.random(), 2) * 6);
      pos = forward ? pos + mag : pos - mag;
      stops.push(pos);
    }

    const runBonus = (idx: number, prev: number) => {
      if (idx >= stops.length) {
        land(prev);
        return;
      }
      const target = stops[idx];
      const mag = Math.abs(target - prev);
      runPhase(prev, target, 2800 + mag * 5, () => runBonus(idx + 1, target));
    };

    const dur1 = 3800 + Math.random() * 1600;
    runPhase(from, fakeTarget, dur1, () => runBonus(0, fakeTarget));
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(wonRef.current);
    },
    [],
  );

  const done = landed >= 0;

  return (
    <div className="screen roulette">
      <p className="eyebrow">룰렛</p>
      <h2 className="stage-title">
        {spinning ? (
          <PlayerName i={current}>{items[current]}</PlayerName>
        ) : done ? (
          <PlayerName i={landed}>{items[landed]}</PlayerName>
        ) : (
          '돌려서 뽑으세요'
        )}
      </h2>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden>▾</div>
        <div className="wheel" style={{ background, transform: `rotate(${rotation}deg)` }}>
          {items.map((label, i) => {
            const angle = i * sliceAngle;
            return (
              <span key={i} className="wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                <span className={`wheel-label-text ${done && i === landed ? 'is-winner' : ''}`}>
                  {label}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <button
        className="btn-primary"
        onClick={spin}
        disabled={spinning || done}
        style={{ visibility: spinning || done ? 'hidden' : 'visible' }}
      >
        돌리기
      </button>
    </div>
  );
}
