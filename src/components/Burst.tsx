import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { BURST_COLORS } from '../palette';

/**
 * 당첨 폭죽 — 위치가 지정된 부모의 중심에서 사방으로 터진다.
 * 카드 뽑기의 연출을 표준으로 모든 게임이 공유한다.
 */
export function Burst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const d = 75 + Math.random() * 150;
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          rot: Math.random() * 540 - 270,
          delay: Math.random() * 0.08,
          color: BURST_COLORS[i % BURST_COLORS.length],
        };
      }),
    [],
  );
  return (
    <span className="card-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={
            {
              background: p.color,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
