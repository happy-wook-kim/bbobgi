import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App 전체 흐름', () => {
  it('카드 연출을 골라 끝까지 진행하면 당첨 연출이 나온다', async () => {
    render(<App />);

    // 1) 연출 선택
    await userEvent.click(screen.getByRole('button', { name: /카드 뽑기/ }));

    // 2) 인원 수 그대로 카드 깔기
    await userEvent.click(screen.getByRole('button', { name: '카드 깔기' }));

    // 3) 카드를 모두 뒤집으면 당첨 카드가 나온다
    const cards = screen.getAllByRole('button', { name: '카드 뒤집기' });
    for (const card of cards) {
      await userEvent.click(card);
    }

    // 4) 잠깐 뒤 당첨 연출
    expect(
      await screen.findByText(/쏘기로 했어요/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});
