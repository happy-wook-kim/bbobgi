import type { AnimationKind } from '../types';
import { CardDraw } from './animations/CardDraw';
import { Roulette } from './animations/Roulette';
import { Ladder } from './animations/Ladder';

type Props = {
  kind: AnimationKind;
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

/** 종류에 맞는 게임을 그리고, 끝나면 onWin(index)으로 걸린 사람을 알린다. */
export function GameStage({ kind, items, winnerIndex, onWin }: Props) {
  if (kind === 'card') return <CardDraw items={items} winnerIndex={winnerIndex} onWin={onWin} />;
  if (kind === 'roulette') return <Roulette items={items} onWin={onWin} />;
  return <Ladder items={items} winnerIndex={winnerIndex} onWin={onWin} />;
}
