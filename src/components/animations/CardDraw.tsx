import { useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

export function CardDraw({ items, winnerIndex, onComplete }: Props) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const found = flipped.includes(winnerIndex);
  const nextOrder = flipped.length + 1;

  const flip = (i: number) => {
    if (flipped.includes(i) || found) return;
    setFlipped((f) => [...f, i]);
  };

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
      {found && <WinnerBurst overlay onRestart={onComplete} />}
    </div>
  );
}
