import { WinnerBurst } from './WinnerBurst';

type Props = {
  winner: string;
  onRestart: () => void;
};

export function ResultScreen({ winner, onRestart }: Props) {
  return <WinnerBurst label={winner} sub="님이 오늘 쏘기로 했어요 ☕" onRestart={onRestart} />;
}
