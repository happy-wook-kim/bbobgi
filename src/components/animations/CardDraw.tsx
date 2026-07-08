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
              <span className="flip-face">{isFlipped ? (isWinner ? '🎯' : token) : '?'}</span>
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
