import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultScreen } from './ResultScreen';

describe('ResultScreen', () => {
  it('당첨자 이름과 문구를 보여준다', () => {
    render(<ResultScreen winner="영희" onRestart={vi.fn()} />);
    expect(screen.getByText('영희')).toBeInTheDocument();
    expect(screen.getByText(/오늘 쏘기로 했어요/)).toBeInTheDocument();
  });

  it('다시하기를 누르면 onRestart가 호출된다', async () => {
    const onRestart = vi.fn();
    render(<ResultScreen winner="철수" onRestart={onRestart} />);
    screen.getByRole('button', { name: '다시하기' }).click();
    expect(onRestart).toHaveBeenCalled();
  });
});
