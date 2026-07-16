import type { AnimationKind } from '../types';
import { shuffle } from './shuffle';

const KINDS: AnimationKind[] = ['card', 'roulette', 'ladder', 'horse', 'dice'];

/** 다섯 게임 중 하나를 균등 확률로 고른다. */
export function randomKind(rand: () => number = Math.random): AnimationKind {
  return KINDS[Math.floor(rand() * KINDS.length)];
}

/**
 * 다섯 게임을 섞은 '가방'을 만든다. 가방을 다 비우기 전엔 같은 게임이 반복되지 않고,
 * 직전 게임(last)이 새 가방의 첫 판에 또 나오지도 않는다. (점수 대결의 게임 다양성용)
 */
export function shuffleKinds(
  last: AnimationKind | null,
  rand: () => number = Math.random,
): AnimationKind[] {
  const bag = shuffle(KINDS, rand);
  if (last && bag[0] === last) {
    const j = 1 + Math.floor(rand() * (bag.length - 1));
    [bag[0], bag[j]] = [bag[j], bag[0]];
  }
  return bag;
}
