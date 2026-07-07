import type { AnimationKind } from '../types';

type Props = {
  winner: string;
  kind: AnimationKind;
  onRestart: () => void;
};

export function ResultScreen({ winner, kind, onRestart }: Props) {
  const isCard = kind === 'card';
  return (
    <div className="screen result">
      <p className="eyebrow">{isCard ? '당첨 카드' : '오늘의 주인공'}</p>
      <div className="result-winner">{winner}</div>
      <p className="result-sub">
        {isCard ? '이 카드를 뽑은 분이 쏘기로 했어요 ☕' : '님이 오늘 쏘기로 했어요 ☕'}
      </p>
      <button className="btn-primary" onClick={onRestart}>
        다시하기
      </button>
    </div>
  );
}
