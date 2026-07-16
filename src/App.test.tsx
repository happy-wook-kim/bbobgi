import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App 전체 흐름', () => {
  it('카드 뽑기: 이름 입력 후 시작하면 자동 진행 끝에 당첨 연출이 나온다', async () => {
    render(<App />);

    // 1) 연출 선택
    await userEvent.click(screen.getByRole('button', { name: /카드 뽑기/ }));

    // 2) 이름 입력 후 시작
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));

    // 3) 슬롯 자동 진행 시작 (게임 화면의 시작 버튼)
    await userEvent.click(await screen.findByRole('button', { name: '시작' }));

    // 4) 차례가 자동으로 돌다 당첨 연출 (2명: 최대 두 스핀 ≈ 6~9초)
    expect(
      await screen.findByText(/쏘기로 했어요/, {}, { timeout: 15000 }),
    ).toBeInTheDocument();
  }, 20000);
});
