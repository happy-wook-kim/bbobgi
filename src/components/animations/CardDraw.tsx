import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

const CONFETTI = ['#4338ff', '#ff5a5f', '#ffb020', '#20c997', '#f74fd4', '#17171a'];

/** 당첨 카드 중심에서 사방으로 터지는 작은 폭죽 */
function CardConfetti() {
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
          color: CONFETTI[i % CONFETTI.length],
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

export function CardDraw({ items, winnerIndex, onWin }: Props) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [settled, setSettled] = useState<number[]>([]); // 뒤집기 완료 → 3D 해제
  const wonRef = useRef(0);
  const found = flipped.includes(winnerIndex);
  const nextOrder = flipped.length + 1;

  const flip = (i: number) => {
    if (flipped.includes(i) || found) return;
    setFlipped((f) => [...f, i]);
  };

  // 당첨 카드가 나오면 잠깐 뒤 결과를 알린다.
  // onWin에는 위치가 아니라 '당첨 카드를 몇 번째로 뒤집었는지(0-based)'를 넘긴다.
  // 점수 모드에서 참가자가 1·2·3번 순서대로 뽑으므로, 이 순번의 참가자가 걸린 사람이 된다.
  useEffect(() => {
    if (!found) return;
    const order = flipped.indexOf(winnerIndex);
    wonRef.current = window.setTimeout(() => onWin(order), 900);
    return () => clearTimeout(wonRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  return (
    <div className="screen cards">
      <p className="eyebrow">카드 뽑기</p>
      <h2 className="stage-title">
        {found ? '당첨 카드가 나왔어요' : `${nextOrder}번째, 카드를 뽑으세요`}
      </h2>
      <div className="card-grid">
        {items.map((_, i) => {
          const isFlipped = flipped.includes(i);
          const isSettled = settled.includes(i);
          const isWinner = i === winnerIndex;
          return (
            <button
              key={i}
              className={`flip-card ${isFlipped ? 'is-flipped' : ''} ${
                isSettled ? 'is-settled' : ''
              } ${isSettled && isWinner ? 'is-winner' : ''}`}
              onClick={() => flip(i)}
              disabled={isFlipped || found}
              aria-label={isFlipped ? undefined : '카드 뒤집기'}
              onTransitionEnd={() => {
                if (isFlipped && !settled.includes(i)) setSettled((s) => [...s, i]);
              }}
            >
              <span className="flip-inner">
                <span className="flip-face flip-back" aria-hidden>?</span>
                <span className="flip-face flip-front">
                  {isWinner ? (
                    <span style={{ color: 'initial' }}>🎯</span>
                  ) : (
                    <svg className="mark-x" viewBox="0 0 100 100" aria-hidden>
                      <line x1="26" y1="26" x2="74" y2="74" />
                      <line x1="74" y1="26" x2="26" y2="74" />
                    </svg>
                  )}
                </span>
              </span>
              {isSettled && isWinner && <CardConfetti />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
