import type { ComponentType } from 'react';
import { CardDraw } from './components/animations/CardDraw';
import { Roulette } from './components/animations/Roulette';
import { Ladder } from './components/animations/Ladder';
import { HorseRace } from './components/animations/HorseRace';
import { DiceSlam } from './components/animations/DiceSlam';

/** 모든 게임은 동일 시그니처로 호출된다. winnerIndex를 안 쓰는 게임(룰렛·주사위)은 무시하면 된다. */
type GameComponent = ComponentType<{
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
}>;

type GameDef = {
  kind: string;
  icon: string;
  title: string;
  desc: string;
  Component: GameComponent;
};

/**
 * 게임 레지스트리 — 새 게임은 여기 한 줄만 추가하면
 * 메뉴·타입·GameStage·설정 라벨·랜덤/점수 풀에 전부 자동 반영된다.
 */
export const GAMES = [
  { kind: 'card', icon: '🃏', title: '카드 뽑기', desc: '한 장씩 뒤집어 당첨 확인', Component: CardDraw },
  { kind: 'roulette', icon: '🎡', title: '룰렛', desc: '돌려서 멈추는 사람', Component: Roulette },
  { kind: 'ladder', icon: '🪜', title: '사다리타기', desc: '줄 따라 내려가서', Component: Ladder },
  { kind: 'horse', icon: '🏇', title: '경마', desc: '꼴찌로 들어온 말이', Component: HorseRace },
  { kind: 'dice', icon: '🎲', title: '주사위', desc: '쿵! 쳐서 굴리다 멈춘 구역', Component: DiceSlam },
] as const satisfies readonly GameDef[];

export type AnimationKind = (typeof GAMES)[number]['kind'];

export const GAME_KINDS: AnimationKind[] = GAMES.map((g) => g.kind);

export function gameOf(kind: AnimationKind) {
  return GAMES.find((g) => g.kind === kind)!;
}
