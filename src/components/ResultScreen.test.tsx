import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultScreen } from './ResultScreen';
import type { Participant, Outcome } from '../types';

const parts: Participant[] = [
  { id: 'p-0', name: '철수', token: '🍎 사과' },
  { id: 'p-1', name: '영희', token: '🍌 바나나' },
];

describe('ResultScreen', () => {
  it('single 모드에서 당첨자 이름을 보여준다', () => {
    render(
      <ResultScreen
        participants={parts}
        outcomes={[]}
        result={{ mode: 'single', winnerId: 'p-1' }}
        onRestart={vi.fn()}
      />,
    );
    expect(screen.getByText(/영희/)).toBeInTheDocument();
  });

  it('assign 모드에서 참가자별 결과를 보여준다', () => {
    const outcomes: Outcome[] = [{ id: 'o-0', label: '전액' }, { id: 'o-1', label: '반값' }];
    render(
      <ResultScreen
        participants={parts}
        outcomes={outcomes}
        result={{ mode: 'assign', assignments: { 'p-0': 'o-0', 'p-1': 'o-1' } }}
        onRestart={vi.fn()}
      />,
    );
    expect(screen.getByText(/철수/)).toBeInTheDocument();
    expect(screen.getByText(/전액/)).toBeInTheDocument();
    expect(screen.getByText(/반값/)).toBeInTheDocument();
  });
});
