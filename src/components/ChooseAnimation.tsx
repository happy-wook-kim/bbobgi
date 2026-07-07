import type { AnimationKind } from '../types';

type Props = {
  onChoose: (kind: AnimationKind) => void;
};

const OPTIONS: { kind: AnimationKind; icon: string; title: string; desc: string }[] = [
  { kind: 'card', icon: '🃏', title: '카드 뽑기', desc: '한 장씩 뒤집어 당첨 확인' },
  { kind: 'roulette', icon: '🎡', title: '룰렛', desc: '돌려서 멈추는 사람' },
  { kind: 'ladder', icon: '🪜', title: '사다리타기', desc: '줄 따라 내려가서' },
];

export function ChooseAnimation({ onChoose }: Props) {
  return (
    <div className="screen choose">
      <header className="hero">
        <h1 className="hero-title">뽑기</h1>
        <p className="hero-sub">오늘 커피값, 누가 쏠까?</p>
      </header>
      <div className="choose-list">
        {OPTIONS.map((opt) => (
          <button key={opt.kind} className="choose-card" onClick={() => onChoose(opt.kind)}>
            <span className="choose-icon" aria-hidden>{opt.icon}</span>
            <span className="choose-text">
              <b>{opt.title}</b>
              <small>{opt.desc}</small>
            </span>
            <span className="choose-arrow" aria-hidden>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
