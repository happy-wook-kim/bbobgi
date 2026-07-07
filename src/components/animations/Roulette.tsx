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

/**
 * back 이징. s > 0이면 목표를 넘쳤다 되돌아오고(역방향 튕김),
 * s < 0이면 목표에 못 미쳤다 마지막에 더 나아가며(정방향 마무리),
 * s = 0이면 튕김 없이 부드럽게 멈춘다. 어느 경우든 t=1에서 정확히 1.
 */
function easeOutBack(t: number, s: number): number {
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

/** 느리게 시작 → 빨라짐 → 느리게 멈춤. 역방향 회전에 쓴다. */
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
  const firstRef = useRef(true);

  // 상단 포인터(12시)가 현재 가리키는 조각. 조각 중앙이 12시 기준이므로 round.
  const pointerIndex = (rot: number) => ((Math.round(-rot / sliceAngle) % n) + n) % n;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setDone(false);

    // 현재 회전에서 이어서 누적. 방향·바퀴 수·시간·튕김을 매번 랜덤화.
    const from = rotation;
    const finalMod = ((((-winnerIndex * sliceAngle) % 360) + 360) % 360);
    const turns = 5 + Math.floor(Math.random() * 5); // 5~9바퀴 (역방향도 여러 바퀴)
    const reverse = Math.random() < 0.4; // 40% 역방향
    const target = reverse
      ? (Math.floor(from / 360) - turns) * 360 + finalMod
      : (Math.floor(from / 360) + turns) * 360 + finalMod;
    const delta = target - from;

    // 정방향: 빠르게 시작 → 감속 + 확률적 튕김(역/정/없음).
    // 역방향: 느리게 시작 → 빨라짐 → 종료 즈음 감속(ease-in-out).
    let ease: (t: number) => number;
    if (reverse) {
      ease = easeInOut;
    } else {
      const r = Math.random();
      const s = r < 0.4 ? 0.9 + Math.random() * 1.4 : r < 0.75 ? -(0.4 + Math.random() * 0.7) : 0;
      ease = (t) => easeOutBack(t, s);
    }
    const duration = 3800 + Math.random() * 1600;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const rot = from + ease(t) * delta;
      setRotation(rot);
      setCurrent(pointerIndex(rot));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setRotation(target);
        setCurrent(winnerIndex);
        setSpinning(false);
        setDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(step);
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

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

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
