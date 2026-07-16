/** 참가자 식별 색 — 모든 게임에서 같은 순번은 같은 색을 쓴다. */
export const PLAYER_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1',
  '#c2185b', '#fbc02d', '#5e35b1', '#00897b', '#d81b60', '#3949ab',
];

export const playerColor = (i: number) => PLAYER_COLORS[i % PLAYER_COLORS.length];
