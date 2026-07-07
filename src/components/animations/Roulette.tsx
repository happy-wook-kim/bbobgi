import { useMemo, useState } from 'react';
import type { Participant, Outcome, DrawResult } from '../../types';
import { outcomeLabel } from '../../labels';

type Props = {
  participants: Participant[];
  outcomes: Outcome[];
  result: DrawResult;
  onComplete: () => void;
};

const COLORS = ['#0071e3', '#ff9500', '#34c759', '#ff2d55', '#af52de', '#5ac8fa', '#ffcc00', '#5856d6'];

function conicBackground(n: number): string {
  const slice = 100 / n;
  const stops = Array.from({ length: n }, (_, i) => {
    const c = COLORS[i % COLORS.length];
    return `${c} ${i * slice}% ${(i + 1) * slice}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

/**
 * 룰렛 조각 라벨과 "정지해야 하는 조각 index" 시퀀스를 순수하게 구성한다.
 * single: 조각 = 참가자 토큰, targetSeq = [당첨자 index] (1스핀).
 * assign: 조각 = 실제로 배정된 outcome id의 집합(등장 순서로 중복 제거, blank 포함),
 *         targetSeq[i] = 참가자 i에게 배정된 id가 그 집합에서 위치한 index.
 */
export function buildWheel(
  participants: Participant[],
  outcomes: Outcome[],
  result: DrawResult,
): { slices: string[]; targetSeq: number[] } {
  if (result.mode === 'single') {
    const slices = participants.map((p) => p.token);
    const winnerIdx = participants.findIndex((p) => p.id === result.winnerId);
    return { slices, targetSeq: [winnerIdx] };
  }
  const assignedIds: string[] = [];
  participants.forEach((p) => {
    const id = result.assignments[p.id];
    if (!assignedIds.includes(id)) assignedIds.push(id);
  });
  const slices = assignedIds.map((id) => outcomeLabel(outcomes, id));
  const targetSeq = participants.map((p) => assignedIds.indexOf(result.assignments[p.id]));
  return { slices, targetSeq };
}

export function Roulette({ participants, outcomes, result, onComplete }: Props) {
  const { slices, targetSeq } = useMemo(
    () => buildWheel(participants, outcomes, result),
    [participants, outcomes, result],
  );
  const prompts = useMemo(() => {
    if (result.mode === 'single') return ['돌려서 당첨자를 뽑으세요'];
    return participants.map((p) => `${p.token} 님 차례 — 돌리세요`);
  }, [participants, result.mode]);

  const n = slices.length;
  const sliceAngle = 360 / n;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [step, setStep] = useState(0); // 몇 번째 스핀까지 끝났나
  const background = useMemo(() => conicBackground(n), [n]);

  const done = step >= targetSeq.length;

  const spin = () => {
    if (spinning || done) return;
    const targetIdx = targetSeq[step];
    // 조각 index의 중심을 포인터(상단, 0deg)로 가져오는 회전량 + 넉넉한 바퀴수
    const base = 360 * 5;
    const center = targetIdx * sliceAngle + sliceAngle / 2;
    const next = Math.ceil(rotation / 360) * 360 + base + (360 - center);
    setSpinning(true);
    setRotation(next);
  };

  return (
    <div className="screen roulette">
      <h2>{done ? '완료!' : prompts[step]}</h2>
      <div className="wheel-wrap">
        <div className="pointer">▼</div>
        <div
          className="wheel"
          style={{ background, transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={() => {
            setSpinning(false);
            setStep((s) => s + 1);
          }}
        />
      </div>
      {!done ? (
        <button className="primary" disabled={spinning} onClick={spin}>
          돌리기
        </button>
      ) : (
        <button className="primary" onClick={onComplete}>
          결과 보기
        </button>
      )}
    </div>
  );
}
