export type Rung = { row: number; col: number };

/**
 * 입구 i가 출구 perm[i]에 도달하도록 하는 사다리 가로줄을 생성한다.
 * 버블정렬의 인접 스왑을 각각 별도 행에 배치한다(한 행에 가로줄 하나 → 사다리 규칙 준수).
 */
export function permToRungs(perm: number[]): Rung[] {
  const arr = [...perm]; // arr[col] = 그 열의 라인이 향할 출구
  const rungs: Rung[] = [];
  let row = 0;
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let col = 0; col < arr.length - 1; col++) {
      if (arr[col] > arr[col + 1]) {
        [arr[col], arr[col + 1]] = [arr[col + 1], arr[col]];
        rungs.push({ row, col });
        row++;
        swapped = true;
      }
    }
  }
  return rungs;
}

/** 가로줄을 위→아래로 적용하여 각 입구가 도달하는 출구 배열을 반환한다. */
export function applyRungs(rungs: Rung[], n: number): number[] {
  const pos = Array.from({ length: n }, (_, i) => i); // pos[col] = 그 열에 있는 입구 id
  const sorted = [...rungs].sort((a, b) => a.row - b.row);
  for (const { col } of sorted) {
    [pos[col], pos[col + 1]] = [pos[col + 1], pos[col]];
  }
  // pos[col] = 입구 id가 최종적으로 도달한 열(col). 입구별 출구로 역변환.
  const exitOf = new Array<number>(n);
  pos.forEach((entryId, col) => {
    exitOf[entryId] = col;
  });
  return exitOf;
}
