import type { AnimationKind } from '../types';
import { gameOf } from '../games';

type Props = {
  kind: AnimationKind;
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

/** 레지스트리에서 게임을 찾아 그린다. 끝나면 onWin(index)으로 걸린 사람을 알린다. */
export function GameStage({ kind, items, winnerIndex, onWin }: Props) {
  const Game = gameOf(kind).Component;
  return <Game items={items} winnerIndex={winnerIndex} onWin={onWin} />;
}
