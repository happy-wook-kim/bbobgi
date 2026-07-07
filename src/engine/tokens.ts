import { shuffle } from './shuffle';

const TOKEN_POOL = [
  '🍎', '🍌', '🍇', '🍓', '🍑', '🍒',
  '🍉', '🍊', '🥝', '🥭', '🍍', '🥥',
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐨',
  '🦁', '🐯', '🐸', '🐵', '🐧', '🦉',
  '🌸', '🌻', '🌵', '🍀', '⭐', '🌙',
];

/** count개의 서로 다른 단어/이모지를 랜덤 배정한다. 풀 초과분은 번호를 붙여 유일하게 만든다. */
export function assignTokens(count: number, rand: () => number = Math.random): string[] {
  const shuffled = shuffle(TOKEN_POOL, rand);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = shuffled[i % shuffled.length];
    const round = Math.floor(i / shuffled.length);
    result.push(round === 0 ? base : `${base} ${round + 1}`);
  }
  return result;
}
