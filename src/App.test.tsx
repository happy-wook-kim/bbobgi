import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App 전체 흐름', () => {
  it('사다리 연출을 골라 끝까지 진행하면 당첨 결과가 나온다', async () => {
    render(<App />);

    // 1) 연출 선택
    await userEvent.click(screen.getByRole('button', { name: /사다리타기/ }));

    // 2) 이름 입력
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));

    // 3) 사다리: 두 참가자 경로 모두 확인
    await userEvent.click(screen.getByRole('button', { name: /철수/ }));
    await userEvent.click(screen.getByRole('button', { name: /영희/ }));
    await userEvent.click(screen.getByRole('button', { name: '결과 보기' }));

    // 4) 결과
    expect(screen.getByText(/오늘 쏘기로 했어요/)).toBeInTheDocument();
  });
});
