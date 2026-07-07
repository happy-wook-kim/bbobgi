import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  items: string[];
  winnerIndex: number;
  nonce: number;
  onComplete: () => void;
  onReplay: () => void;
};

// 빨주노초파남보
const RAINBOW = ['#e53935', '#f57c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa'];

/**
 * n등분 원판 배경을 무지개 색으로 칠한다.
 * 조각 i의 "중앙"이 12시 기준 i*(360/n)도에 오도록 from을 -slice/2로 맞춘다.
 */
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

export function Roulette({ items, winnerIndex, nonce, onComplete, onReplay }: Props) {
  const n = items.length;
  const sliceAngle = 360 / n;
  const background = useMemo(() => conicBackground(n), [n]);

  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef(0);
  const pauseRef = useRef(0);
  const firstRef = useRef(true);

  // 상단 포인터(12시)가 현재 가리키는 조각. 조각 중앙이 12시 기준이므로 round.
  const pointerIndex = (rot: number) => ((Math.round(-rot / sliceAngle) % n) + n) % n;

  const finish = () => {
    setCurrent(winnerIndex);
    setSpinning(false);
    setDone(true);
  };

  // fromR → toR 로 dur동안 ease-in-out 회전. 끝나면 onEnd.
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
        onEnd();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setDone(false);

    // 메인 회전은 항상 정방향. 당첨 조각 중앙(12시)까지 여러 바퀴.
    const from = rotation;
    const finalMod = ((((-winnerIndex * sliceAngle) % 360) + 360) % 360);
    const turns = 5 + Math.floor(Math.random() * 5);
    const base = (Math.floor(from / 360) + turns) * 360 + finalMod;

    // 보너스: 있을 수도 없을 수도(60%), 크기는 랜덤(제곱 분포 → 작은 게 자주, 큰 게 가끔).
    // 크면 여러 바퀴만큼 되돌아가기도 한다. 정/역 방향도 랜덤.
    const hasBonus = Math.random() < 0.6;
    let fakeTarget = base;
    if (hasBonus) {
      const forward = Math.random() < 0.5;
      const mag = Math.pow(Math.random(), 2) * 540; // 0 ~ 약 1.5바퀴
      fakeTarget = forward ? base - mag : base + mag;
    }
    const bonusMag = Math.abs(base - fakeTarget);

    const dur1 = 3600 + Math.random() * 1600;
    runPhase(from, fakeTarget, dur1, () => {
      if (bonusMag < 1) {
        finish();
        return;
      }
      // "끝난 줄 알았지" 하는 짧은 정지 후 보너스 회전(양만큼 시간도 늘어남)
      pauseRef.current = window.setTimeout(() => {
        runPhase(fakeTarget, base, 600 + bonusMag * 1.6, finish);
      }, 420);
    });
  };

  // "다시 돌리기"(nonce 증가) 시 바로 재회전. 첫 마운트는 건너뛴다.
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    spin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(pauseRef.current);
    },
    [],
  );

  const active = spinning || done;
  const centerColor = RAINBOW[current % RAINBOW.length];

  return (
    <div className="screen roulette">
      <p className="eyebrow">룰렛</p>
      <h2 className="stage-title">
        {done ? '멈췄어요' : spinning ? '누가 걸릴까…' : '돌려서 뽑으세요'}
      </h2>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden>▾</div>
        <div className="wheel" style={{ background, transform: `rotate(${rotation}deg)` }}>
          {items.map((label, i) => {
            const angle = i * sliceAngle; // 조각 중앙 각도(12시 기준)
            // 라벨을 원판 표면에 고정 → 원판과 하나로 함께 회전한다.
            return (
              <span key={i} className="wheel-label" style={{ transform: `rotate(${angle}deg)` }}>
                <span className={`wheel-label-text ${done && i === winnerIndex ? 'is-winner' : ''}`}>
                  {label}
                </span>
              </span>
            );
          })}
        </div>
        <div className="wheel-center" style={{ color: active ? centerColor : undefined }}>
          {active ? items[current] : '?'}
        </div>
      </div>
      {!done ? (
        <button className="btn-primary" onClick={spin} disabled={spinning}>
          돌리기
        </button>
      ) : (
        <div className="btn-row">
          <button className="btn-primary" onClick={onComplete}>
            결과 보기
          </button>
          <button className="btn-ghost" onClick={onReplay}>
            다시 돌리기 (테스트)
          </button>
        </div>
      )}
    </div>
  );
}
