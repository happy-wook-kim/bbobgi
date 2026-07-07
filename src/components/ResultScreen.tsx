import type { Participant, Outcome, DrawResult } from '../types';

type Props = {
  participants: Participant[];
  outcomes: Outcome[];
  result: DrawResult;
  onRestart: () => void;
};

export function ResultScreen({ participants, outcomes, result, onRestart }: Props) {
  const labelOf = (outcomeId: string) => {
    if (outcomeId.startsWith('blank-')) return '꽝';
    return outcomes.find((o) => o.id === outcomeId)?.label ?? outcomeId;
  };

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
              <strong>{p.name}</strong> → {labelOf(result.assignments[p.id])}
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
