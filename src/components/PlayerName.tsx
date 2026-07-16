import type { ReactNode } from 'react';
import { playerColor } from '../palette';

type Props = { i: number; children: ReactNode; win?: boolean };

/**
 * 참가자 이름 공통 강조 — 굵게 + 주변 텍스트보다 크게.
 * 평소엔 참가자 색, 당첨됐을 땐 보라색 텍스트(전체 룰).
 */
export function PlayerName({ i, children, win }: Props) {
  return (
    <b className="player-name" style={{ color: win ? undefined : playerColor(i) }}>
      {children}
    </b>
  );
}
