import type { ReactNode } from 'react';
import { playerColor } from '../palette';

type Props = { i: number; children: ReactNode };

/** 참가자 이름 공통 강조 — 항상 참가자 색 + 굵게 + 주변 텍스트보다 크게 */
export function PlayerName({ i, children }: Props) {
  return (
    <b className="player-name" style={{ color: playerColor(i) }}>
      {children}
    </b>
  );
}
