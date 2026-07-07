import { useEffect, useRef, useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

export function CardDraw({ items, winnerIndex, onComplete }: Props) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const revealRef = useRef(0);
  const found = flipped.includes(winnerIndex);
  const nextOrder = flipped.length + 1;

  const flip = (i: number) => {
    if (flipped.includes(i) || found) return;
    setFlipped((f) => [...f, i]);
  };

  // 당첨 카드가 나오면 잠깐 확인할 여유를 두고 당첨 연출을 띄운다.
  useEffect(() => {
    if (!found) return;
    revealRef.current = window.setTimeout(() => setReveal(true), 900);
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
          const isWinner = i === winnerIndex;
          return (
            <button
              key={i}
              className={`flip-card ${isFlipped ? 'is-flipped' : ''} ${
                isFlipped && isWinner ? 'is-winner' : ''
              }`}
              onClick={() => flip(i)}
              disabled={isFlipped || found}
              aria-label={isFlipped ? undefined : '카드 뒤집기'}
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
          label={items[winnerIndex]}
          sub="이 카드를 뽑은 분이 쏘기로 했어요 ☕"
          onRestart={onComplete}
        />
      )}
    </div>
  );
}
