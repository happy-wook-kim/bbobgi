import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';

describe('SetupScreen', () => {
  it('이름 2개와 single 모드로 시작하면 onStart가 호출된다', async () => {
    const onStart = vi.fn();
    render(<SetupScreen onStart={onStart} />);
    const inputs = screen.getAllByPlaceholderText('참가자 이름');
    await userEvent.type(inputs[0], '철수');
    await userEvent.type(inputs[1], '영희');
    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    expect(onStart).toHaveBeenCalledWith(['철수', '영희'], 'single', []);
  });

  it('이름이 2개 미만이면 시작 버튼이 비활성화된다', async () => {
    render(<SetupScreen onStart={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText('참가자 이름');
    await userEvent.type(inputs[0], '철수');
    expect(screen.getByRole('button', { name: '시작' })).toBeDisabled();
  });
});
