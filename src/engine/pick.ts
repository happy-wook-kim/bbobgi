/** items 중 한 명(당첨)을 균등 확률로 뽑아 그 인덱스를 반환한다. */
export function pickWinner(count: number, rand: () => number = Math.random): number {
  return Math.floor(rand() * count);
}
