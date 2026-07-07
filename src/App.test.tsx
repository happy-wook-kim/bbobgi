import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App 전체 흐름', () => {
  it('single + 카드 연출로 끝까지 진행하면 당첨 결과가 나온다', async () => {
    render(<App />);
    const inputs = screen.getAllByPlaceholderText('참가자 이름');
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));

    // reveal: 두 참가자 확인
    await userEvent.click(screen.getByRole('button', { name: '내 단어 확인' }));
    await userEvent.click(screen.getByRole('button', { name: '확인 · 다음 사람' }));
    await userEvent.click(screen.getByRole('button', { name: '내 단어 확인' }));
    await userEvent.click(screen.getByRole('button', { name: '확인 · 뽑기 시작' }));

    // choose: 카드
    await userEvent.click(screen.getByRole('button', { name: '🃏 카드뽑기' }));

    // animate: 카드 한 장 뒤집기
    const cards = screen.getAllByRole('button', { name: '?' });
    await userEvent.click(cards[0]);
    await userEvent.click(screen.getByRole('button', { name: '결과 보기' }));

    // result
    expect(screen.getByText(/당첨!/)).toBeInTheDocument();
  });
});
