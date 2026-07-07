import { shuffle } from './shuffle';

const TOKEN_POOL = [
  '🍎 사과', '🍌 바나나', '🍇 포도', '🍓 딸기', '🍑 복숭아', '🍒 체리',
  '🍉 수박', '🍊 귤', '🥝 키위', '🥭 망고', '🍍 파인애플', '🥥 코코넛',
  '🐶 강아지', '🐱 고양이', '🦊 여우', '🐻 곰', '🐼 판다', '🐨 코알라',
  '🦁 사자', '🐯 호랑이', '🐸 개구리', '🐵 원숭이', '🐧 펭귄', '🦉 부엉이',
  '🌸 벚꽃', '🌻 해바라기', '🌵 선인장', '🍀 클로버', '⭐ 별', '🌙 달',
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
