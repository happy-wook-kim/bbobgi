import type { Participant, Outcome, DrawResult } from '../types';
import { outcomeLabel } from '../labels';

type Props = {
  participants: Participant[];
  outcomes: Outcome[];
  result: DrawResult;
  onRestart: () => void;
};

export function ResultScreen({ participants, outcomes, result, onRestart }: Props) {
  return (
    <div className="screen result">
      <h2>🎉 결과</h2>
      {result.mode === 'single' ? (
        <div className="winner">
          {participants.find((p) => p.id === result.winnerId)?.name} 님 당첨!
        </div>
      ) : (
        <ul className="assign-list">
          {participants.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> → {outcomeLabel(outcomes, result.assignments[p.id])}
            </li>
          ))}
        </ul>
      )}
      <button className="primary" onClick={onRestart}>
        다시하기
      </button>
    </div>
  );
}
