import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

// 빨주노초파남보
const RAINBOW = ['#e53935', '#f57c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa'];

/** n등분 원판 배경을 무지개 색으로 칠한다. */
function conicBackground(n: number): string {
  const slice = 100 / n;
  const stops = Array.from({ length: n }, (_, i) => {
    return `${RAINBOW[i % RAINBOW.length]} ${i * slice}% ${(i + 1) * slice}%`;
  });
  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

/** 끝에서 살짝 넘쳤다가 되돌아오는 이징. s가 클수록 튕김이 강하다. */
function easeOutBack(t: number, s: number): number {
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

export function Roulette({ items, winnerIndex, onComplete }: Props) {
  const n = items.length;
  const sliceAngle = 360 / n;
  const background = useMemo(() => conicBackground(n), [n]);

  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef(0);

  // 상단 포인터(12시)가 현재 가리키는 조각 인덱스
  const pointerIndex = (rot: number) =>
    Math.floor(((((-rot) % 360) + 360) % 360) / sliceAngle) % n;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const spin = () => {
    if (spinning || done) return;
    setSpinning(true);
    const center = winnerIndex * sliceAngle + sliceAngle / 2;
    const target = 360 * 6 + (360 - center);
    const overshoot = 0.8 + Math.random() * 1.6; // 랜덤 튕김 세기
    const duration = 4200 + Math.random() * 900;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const rot = easeOutBack(t, overshoot) * target;
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
          {items.map((label, i) => (
            <span
              key={i}
              className={`wheel-label ${done && i === winnerIndex ? 'is-winner' : ''}`}
              style={{ transform: `rotate(${i * sliceAngle + sliceAngle / 2}deg)` }}
            >
              <span className="wheel-label-text">{label}</span>
            </span>
          ))}
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
        <button className="btn-primary" onClick={onComplete}>
          결과 보기
        </button>
      )}
    </div>
  );
}
