import { useEffect, useRef, useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onHome: () => void;
  onReplay: () => void;
};

export function CardDraw({ items, winnerIndex, onHome, onReplay }: Props) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [settled, setSettled] = useState<number[]>([]); // 뒤집기 완료 → 3D 해제
  const [reveal, setReveal] = useState(false);
  const revealRef = useRef(0);
  const found = flipped.includes(winnerIndex);
  const nextOrder = flipped.length + 1;

  const flip = (i: number) => {
    if (flipped.includes(i) || found) return;
    setFlipped((f) => [...f, i]);
  };

  useEffect(() => {
    if (!found) return;
    revealRef.current = window.setTimeout(() => setReveal(true), 1800);
    return () => clearTimeout(revealRef.current);
  }, [found]);

  return (
    <div className="screen cards">
      <p className="eyebrow">카드 뽑기</p>
      <h2 className="stage-title">
        {found ? '당첨 카드가 나왔어요' : `${nextOrder}번째, 카드를 뽑으세요`}
      </h2>
      <div className="card-grid">
        {items.map((token, i) => {
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
                <span className="flip-face flip-front">{isWinner ? '🎯' : token}</span>
              </span>
            </button>
          );
        })}
      </div>
      {reveal && (
        <WinnerBurst
          overlay
          label="🎯"
          sub="이 카드를 뽑은 분이 쏘기로 했어요 ☕"
          onHome={onHome}
          onReplay={onReplay}
        />
      )}
    </div>
  );
}
