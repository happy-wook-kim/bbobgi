import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultScreen } from './ResultScreen';

describe('ResultScreen', () => {
  it('이름 모드에서 당첨자 이름과 문구를 보여준다', () => {
    render(<ResultScreen winner="영희" kind="roulette" onRestart={vi.fn()} />);
    expect(screen.getByText('영희')).toBeInTheDocument();
    expect(screen.getByText(/오늘 쏘기로 했어요/)).toBeInTheDocument();
  });

  it('카드 모드에서 당첨 카드 토큰과 카드 문구를 보여준다', () => {
    render(<ResultScreen winner="🍎 사과" kind="card" onRestart={vi.fn()} />);
    expect(screen.getByText('🍎 사과')).toBeInTheDocument();
    expect(screen.getByText(/이 카드를 뽑은 분/)).toBeInTheDocument();
  });

  it('다시하기를 누르면 onRestart가 호출된다', async () => {
    const onRestart = vi.fn();
    render(<ResultScreen winner="철수" kind="ladder" onRestart={onRestart} />);
    screen.getByRole('button', { name: '다시하기' }).click();
    expect(onRestart).toHaveBeenCalled();
  });
});
