import type { AnimationKind } from './games';

// 게임 종류는 레지스트리(src/games.ts)에서 파생된다 — 게임 추가 시 여기 손댈 필요 없음
export type { AnimationKind } from './games';
export type ChooseOption = AnimationKind | 'random' | 'score';
export type Step = 'choose' | 'setup' | 'animate' | 'score';
