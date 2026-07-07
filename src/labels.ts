import type { Outcome } from './types';

/** outcomeId에 대응하는 표시용 라벨을 반환한다. blank-* 패딩 결과는 항상 '꽝'으로 표시한다. */
export function outcomeLabel(outcomes: Outcome[], id: string): string {
  if (id.startsWith('blank-')) return '꽝';
  return outcomes.find((o) => o.id === id)?.label ?? id;
}
