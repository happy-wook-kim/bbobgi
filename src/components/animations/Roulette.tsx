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

/** 감속 이징 (빠르게 → 느리게 멈춤). */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
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

  // fromR → toR 로 dur동안 감속 회전. 끝나면 onEnd.
  const runPhase = (fromR: number, toR: number, dur: number, onEnd: () => void) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const rot = fromR + easeOutCubic(t) * (toR - fromR);
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

    // 멈춘 듯한 지점(fakeTarget)에서 서고, 확률적으로 보너스 회전으로 base(당첨)에 안착.
    const r = Math.random();
    let fakeTarget: number;
    let hasBonus: boolean;
    if (r < 0.4) {
      fakeTarget = base; // 보너스 없음: 바로 당첨에서 멈춤
      hasBonus = false;
    } else if (r < 0.72) {
      // 정방향 보너스: 당첨 직전에 멈췄다가 → 조금 더 정방향으로
      fakeTarget = base - sliceAngle * (0.5 + Math.random() * 0.9);
      hasBonus = true;
    } else {
      // 역방향 보너스: 당첨을 살짝 지나 멈췄다가 → 뒤로 되돌아
      fakeTarget = base + sliceAngle * (0.5 + Math.random() * 0.9);
      hasBonus = true;
    }

    const dur1 = 3600 + Math.random() * 1400;
    runPhase(from, fakeTarget, dur1, () => {
      if (!hasBonus) {
        finish();
        return;
      }
      // "끝난 줄 알았지" 하는 짧은 정지 후 보너스 회전
      pauseRef.current = window.setTimeout(() => {
        runPhase(fakeTarget, base, 750 + Math.random() * 500, finish);
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
