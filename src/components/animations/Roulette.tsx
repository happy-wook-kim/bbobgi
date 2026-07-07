import { useEffect, useMemo, useRef, useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  onComplete: () => void;
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

export function Roulette({ items, onComplete }: Props) {
  const n = items.length;
  const sliceAngle = 360 / n;
  const background = useMemo(() => conicBackground(n), [n]);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(-1); // 최종적으로 멈춘 자리의 조각 = 당첨
  const [reveal, setReveal] = useState(false); // 잠깐 뒤 당첨 연출 표시
  const rafRef = useRef(0);
  const revealRef = useRef(0);

  // 상단 포인터(12시)가 가리키는 조각. 조각 중앙이 12시 기준이므로 round.
  const pointerIndex = (rot: number) => ((Math.round(-rot / sliceAngle) % n) + n) % n;

  const land = (rot: number) => {
    setLanded(pointerIndex(rot));
    setSpinning(false);
    // 멈춘 자리를 눈으로 확인할 여유를 두고 당첨 연출을 띄운다.
    revealRef.current = window.setTimeout(() => setReveal(true), 900);
  };

  // fromR → toR 로 dur동안 ease-in-out 회전. 끝나면 onEnd.
  const runPhase = (fromR: number, toR: number, dur: number, onEnd: () => void) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setRotation(fromR + easeInOut(t) * (toR - fromR));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setRotation(toR);
        onEnd();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const spin = () => {
    if (spinning || landed >= 0) return;
    setSpinning(true);

    // 정방향으로 여러 바퀴 + 랜덤 각도만큼 돌다가 그 자리에 멈춘다. (중앙 정렬 강제 없음)
    const from = rotation;
    const turns = 5 + Math.floor(Math.random() * 5);
    const fakeTarget = (Math.floor(from / 360) + turns) * 360 + Math.random() * 360;

    // 보너스: 멈춘 듯하다 확률적으로(70%) 살짝 더/뒤로 굴러 최종 자리에 안착. 크기 랜덤.
    const hasBonus = Math.random() < 0.7;
    let finalTarget = fakeTarget;
    if (hasBonus) {
      const forward = Math.random() < 0.5;
      const mag = sliceAngle * (0.8 + Math.pow(Math.random(), 2) * 6); // 최소 0.8칸 ~ 여러 칸
      finalTarget = forward ? fakeTarget + mag : fakeTarget - mag;
    }
    const bonusMag = Math.abs(finalTarget - fakeTarget);

    const dur1 = 3800 + Math.random() * 1600;
    runPhase(from, fakeTarget, dur1, () => {
      if (bonusMag < 1) {
        land(fakeTarget);
        return;
      }
      // 멈추는 순간 끊김 없이 바로 보너스 회전으로 이어짐(양만큼 시간도 늘어남)
      runPhase(fakeTarget, finalTarget, 1900 + bonusMag * 3.4, () => land(finalTarget));
    });
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(revealRef.current);
    },
    [],
  );

  const done = landed >= 0;

  return (
    <div className="screen roulette">
      <p className="eyebrow">룰렛</p>
      <h2 className="stage-title">
        {spinning ? '누가 걸릴까…' : done ? '멈췄어요' : '돌려서 뽑으세요'}
      </h2>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden>▾</div>
        <div className="wheel" style={{ background, transform: `rotate(${rotation}deg)` }}>
          {items.map((label, i) => {
            const angle = i * sliceAngle; // 조각 중앙 각도(12시 기준)
            // 배경색(그 조각)을 진하게 처리한 동색 글자 → 배경 위에서 또렷하게
            const shade = `color-mix(in srgb, ${RAINBOW[i % RAINBOW.length]} 58%, #000000)`;
            // 라벨을 원판 표면에 고정 → 원판과 하나로 함께 회전한다.
            return (
              <span key={i} className="wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                <span
                  className={`wheel-label-text ${done && i === landed ? 'is-winner' : ''}`}
                  style={{ color: shade }}
                >
                  {label}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      {!done && (
        <button className="btn-primary" onClick={spin} disabled={spinning}>
          돌리기
        </button>
      )}
      {reveal && (
        <WinnerBurst
          overlay
          label={items[landed]}
          sub="님이 오늘 쏘기로 했어요 ☕"
          onRestart={onComplete}
        />
      )}
    </div>
  );
}
