import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';

describe('SetupScreen - 카드', () => {
  it('기본 인원 수(3)로 카드 깔기를 누르면 3개 토큰으로 onStart가 호출된다', async () => {
    const onStart = vi.fn();
    render(<SetupScreen kind="card" onStart={onStart} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '카드 깔기' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toHaveLength(3);
  });

  it('스텝퍼로 인원 수를 조절할 수 있다', async () => {
    const onStart = vi.fn();
    render(<SetupScreen kind="card" onStart={onStart} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '한 명 늘리기' }));
    await userEvent.click(screen.getByRole('button', { name: '카드 깔기' }));
    expect(onStart.mock.calls[0][0]).toHaveLength(4);
  });
});

describe('SetupScreen - 이름(룰렛/사다리)', () => {
  it('이름 2개를 입력하고 시작하면 이름 배열로 onStart가 호출된다', async () => {
    const onStart = vi.fn();
    render(<SetupScreen kind="roulette" onStart={onStart} onBack={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    expect(onStart).toHaveBeenCalledWith(['철수', '영희']);
  });

  it('이름이 2개 미만이면 시작 버튼이 비활성화된다', async () => {
    render(<SetupScreen kind="ladder" onStart={vi.fn()} onBack={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/참가자/);
    await userEvent.type(inputs[0], '철수');
    expect(screen.getByRole('button', { name: '시작' })).toBeDisabled();
  });
});
