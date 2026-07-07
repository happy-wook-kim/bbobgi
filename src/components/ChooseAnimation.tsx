import type { AnimationKind } from '../types';

type Props = {
  onChoose: (kind: AnimationKind) => void;
};

const OPTIONS: { kind: AnimationKind; label: string }[] = [
  { kind: 'card', label: '🃏 카드뽑기' },
  { kind: 'roulette', label: '🎡 룰렛' },
  { kind: 'ladder', label: '🪜 사다리' },
];

export function ChooseAnimation({ onChoose }: Props) {
  return (
    <div className="screen choose">
      <h2>연출을 고르세요</h2>
      <div className="choose-grid">
        {OPTIONS.map((opt) => (
          <button key={opt.kind} className="choose-btn" onClick={() => onChoose(opt.kind)}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
