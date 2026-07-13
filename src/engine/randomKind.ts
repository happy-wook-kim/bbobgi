import type { AnimationKind } from '../types';

const KINDS: AnimationKind[] = ['card', 'roulette', 'ladder', 'horse'];

/** 네 게임 중 하나를 균등 확률로 고른다. */
export function randomKind(rand: () => number = Math.random): AnimationKind {
  return KINDS[Math.floor(rand() * KINDS.length)];
}
