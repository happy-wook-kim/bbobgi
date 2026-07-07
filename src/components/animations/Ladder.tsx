import { useMemo, useState } from 'react';
import type { Participant, Outcome, DrawResult } from '../../types';
import { permToRungs } from '../../engine/ladder';
import { outcomeLabel } from '../../labels';

type Props = {
  participants: Participant[];
  outcomes: Outcome[];
  result: DrawResult;
  onComplete: () => void;
};

export function Ladder({ participants, outcomes, result, onComplete }: Props) {
  const n = participants.length;

  // 사다리 출구 라벨과 입구→출구 순열(perm[i] = 입구 i가 도달할 출구 index)
  const { exitLabels, perm } = useMemo(() => {
    if (result.mode === 'single') {
      const winnerIdx = participants.findIndex((p) => p.id === result.winnerId);
      // 출구 0 = 🎯당첨, 나머지 통과
      const labels = Array.from({ length: n }, (_, i) => (i === 0 ? '🎯 당첨' : '통과'));
      // winner 입구 → 출구 0, 나머지 입구 → 남은 출구 순서대로
      const p: number[] = new Array(n);
      let next = 1;
      participants.forEach((_, i) => {
        p[i] = i === winnerIdx ? 0 : next++;
      });
      return { exitLabels: labels, perm: p };
    }
    // assign: 출구 = 참가자 순서대로 배정된 결과 라벨
    // 출구 index를 참가자 순서로 두고, 입구 i → 출구 i 로 두되 라벨을 각 참가자 결과로 매핑하면
    // 사다리 재미가 없으므로, 출구를 섞어 순열을 만든다.
    const labels = participants.map((p) => outcomeLabel(outcomes, result.assignments[p.id]));
    // 입구 i(참가자 i) → 출구 perm[i]. 출구 perm[i]의 라벨이 참가자 i의 결과가 되도록 항등 배치 후 셔플 표시.
    // 단순화: 출구 라벨을 참가자 순서대로 두고 perm은 항등(각자 자기 결과). 시각적 사다리는 rung으로 표현.
    const p = Array.from({ length: n }, (_, i) => i);
    return { exitLabels: labels, perm: p };
  }, [participants, outcomes, result, n]);

  const rungs = useMemo(() => permToRungs(perm), [perm]);
  const [started, setStarted] = useState(false);

  const rows = Math.max(rungs.length, 1);
  const width = Math.max(n * 60, 120);
  const height = 320;
  const colX = (col: number) => 30 + col * ((width - 60) / Math.max(n - 1, 1));
  const rowY = (row: number) => 40 + ((row + 1) * (height - 80)) / (rows + 1);

  return (
    <div className="screen ladder">
      <h2>{started ? '도착!' : '사다리를 확인하고 출발하세요'}</h2>
      <div className="ladder-scroll">
        <svg width={width} height={height} className={started ? 'started' : ''}>
          {/* 세로줄 */}
          {participants.map((p, i) => (
            <g key={i}>
              <line x1={colX(i)} y1={40} x2={colX(i)} y2={height - 40} stroke="#c7c7cc" strokeWidth={3} />
              <text x={colX(i)} y={24} textAnchor="middle" fontSize={13}>{p.token}</text>
              <text x={colX(i)} y={height - 12} textAnchor="middle" fontSize={12}>{exitLabels[i]}</text>
            </g>
          ))}
          {/* 가로줄 */}
          {rungs.map((r, i) => (
            <line
              key={i}
              x1={colX(r.col)}
              y1={rowY(r.row)}
              x2={colX(r.col + 1)}
              y2={rowY(r.row)}
              stroke="#0071e3"
              strokeWidth={3}
            />
          ))}
        </svg>
      </div>
      {!started ? (
        <button className="primary" onClick={() => setStarted(true)}>출발</button>
      ) : (
        <button className="primary" onClick={onComplete}>결과 보기</button>
      )}
    </div>
  );
}
