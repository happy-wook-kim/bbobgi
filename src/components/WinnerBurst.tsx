import { useMemo } from 'react';
import type { CSSProperties } from 'react';

const CONFETTI_COLORS = ['#4338ff', '#ff5a5f', '#ffb020', '#20c997', '#f74fd4', '#17171a'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 220;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          rot: Math.random() * 720 - 360,
          delay: Math.random() * 0.12,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          left: 42 + Math.random() * 16,
        };
      }),
    [],
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

type Props = {
  label?: string;
  sub?: string;
  onHome: () => void;
  onReplay?: () => void;
  overlay?: boolean;
};

export function WinnerBurst({ label, sub, onHome, onReplay, overlay }: Props) {
  return (
    <div className={overlay ? 'winner-overlay' : 'screen result'}>
      <Confetti />
      <div className="winner-burst">
        <div className="winner-bang">당첨!</div>
        {label && <div className="result-winner">{label}</div>}
        {sub && <p className="result-sub">{sub}</p>}
        <div className="btn-row">
          {onReplay && (
            <button className="btn-primary" onClick={onReplay}>
              한번 더
            </button>
          )}
          <button className="btn-ghost" onClick={onHome}>
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
