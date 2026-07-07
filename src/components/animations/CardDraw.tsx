import { useState } from 'react';
import type { Participant, Outcome, DrawResult } from '../../types';

type Props = {
  participants: Participant[];
  outcomes: Outcome[];
  result: DrawResult;
  onComplete: () => void;
};

const labelOf = (outcomes: Outcome[], outcomeId: string) =>
  outcomeId.startsWith('blank-') ? '꽝' : outcomes.find((o) => o.id === outcomeId)?.label ?? outcomeId;

export function CardDraw({ participants, outcomes, result, onComplete }: Props) {
  const [flipped, setFlipped] = useState<number[]>([]);

  if (result.mode === 'single') {
    const winner = participants.find((p) => p.id === result.winnerId)!;
    const revealed = flipped.length > 0;
    return (
      <div className="screen cards">
        <h2>카드를 한 장 뒤집으세요</h2>
        <div className="card-grid">
          {participants.map((_, i) => (
            <button
              key={i}
              className={`card ${flipped.includes(i) ? 'flipped' : ''}`}
              disabled={revealed}
              onClick={() => setFlipped([i])}
            >
              {flipped.includes(i) ? `🎯 ${winner.token}` : '?'}
            </button>
          ))}
        </div>
        {revealed && (
          <button className="primary" onClick={onComplete}>
            결과 보기
          </button>
        )}
      </div>
    );
  }

  const assignments = result.assignments;
  const turn = flipped.length; // 다음에 뽑을 참가자 index
  const done = turn >= participants.length;

  return (
    <div className="screen cards">
      <h2>{done ? '모두 뽑았어요' : `${participants[turn].token} 님, 카드를 뽑으세요`}</h2>
      <div className="card-grid">
        {participants.map((_, i) => {
          const order = flipped.indexOf(i); // 이 카드를 뽑은 참가자 순번
          const owner = order >= 0 ? participants[order] : null;
          return (
            <button
              key={i}
              className={`card ${order >= 0 ? 'flipped' : ''}`}
              disabled={order >= 0 || done}
              onClick={() => setFlipped((f) => [...f, i])}
            >
              {owner
                ? `${owner.token} → ${labelOf(outcomes, assignments[owner.id])}`
                : '?'}
            </button>
          );
        })}
      </div>
      {done && (
        <button className="primary" onClick={onComplete}>
          결과 보기
        </button>
      )}
    </div>
  );
}
