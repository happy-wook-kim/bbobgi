import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';

describe('SetupScreen - 이름 입력 (모든 게임 공통)', () => {
  it('카드 뽑기도 이름을 입력하고 시작하면 이름 배열로 onStart가 호출된다', async () => {
    const onStart = vi.fn();
    render(<SetupScreen option="card" onStart={onStart} onBack={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    expect(onStart).toHaveBeenCalledWith(['철수', '영희']);
  });

  it('이름 2개를 입력하고 시작하면 이름 배열로 onStart가 호출된다 (룰렛)', async () => {
    const onStart = vi.fn();
    render(<SetupScreen option="roulette" onStart={onStart} onBack={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    expect(onStart).toHaveBeenCalledWith(['철수', '영희']);
  });

  it('이름이 2개 미만이면 시작 버튼이 비활성화된다', async () => {
    render(<SetupScreen option="ladder" onStart={vi.fn()} onBack={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    expect(screen.getByRole('button', { name: '시작' })).toBeDisabled();
  });
});
