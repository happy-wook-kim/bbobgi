import { useMemo, useState } from 'react';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

/** n등분 원판 배경. 미니멀하게 무채색 두 톤을 번갈아 칠한다. */
function conicBackground(n: number): string {
  const slice = 100 / n;
  const shades = ['#ecece8', '#e0e0da'];
  const stops = Array.from({ length: n }, (_, i) => {
    return `${shades[i % 2]} ${i * slice}% ${(i + 1) * slice}%`;
  });
  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

export function Roulette({ items, winnerIndex, onComplete }: Props) {
  const n = items.length;
  const sliceAngle = 360 / n;
  const background = useMemo(() => conicBackground(n), [n]);
  const [rotation, setRotation] = useState(0);
  const [spun, setSpun] = useState(false);
  const [done, setDone] = useState(false);

  const spin = () => {
    if (spun) return;
    // 당첨 조각 중심(상단 포인터 기준)을 포인터로 가져오도록 6바퀴 + 보정 회전
    const center = winnerIndex * sliceAngle + sliceAngle / 2;
    setRotation(360 * 6 + (360 - center));
    setSpun(true);
  };

  return (
    <div className="screen roulette">
      <p className="eyebrow">룰렛</p>
      <h2 className="stage-title">{done ? '멈췄어요' : '돌려서 뽑으세요'}</h2>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden>▾</div>
        <div
          className="wheel"
          style={{ background, transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={() => setDone(true)}
        >
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
        <div className="wheel-hub" aria-hidden />
      </div>
      {!done ? (
        <button className="btn-primary" onClick={spin} disabled={spun}>
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
