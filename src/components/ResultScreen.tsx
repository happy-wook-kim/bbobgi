type Props = {
  winner: string;
  onRestart: () => void;
};

export function ResultScreen({ winner, onRestart }: Props) {
  return (
    <div className="screen result">
      <p className="eyebrow">오늘의 주인공</p>
      <div className="result-winner">{winner}</div>
      <p className="result-sub">님이 오늘 쏘기로 했어요 ☕</p>
      <button className="btn-primary" onClick={onRestart}>
        다시하기
      </button>
    </div>
  );
}
