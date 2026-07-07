import { useEffect, useMemo, useRef, useState } from 'react';
import { permToRungs } from '../../engine/ladder';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

export function Ladder({ items, winnerIndex, onComplete }: Props) {
  const n = items.length;

  // 입구 i → 출구. 당첨자 입구는 출구 0(🎯), 나머지는 1..n-1 순서대로.
  const perm = useMemo(() => {
    const p = new Array<number>(n);
    let next = 1;
    for (let i = 0; i < n; i++) p[i] = i === winnerIndex ? 0 : next++;
    return p;
  }, [n, winnerIndex]);

  const rungs = useMemo(() => permToRungs(perm), [perm]);

  const [revealed, setRevealed] = useState<number[]>([]);
  const [burst, setBurst] = useState(false);
  const burstRef = useRef(0);
  const winnerRevealed = revealed.includes(winnerIndex);

  // 당첨자 경로를 확인하면 잠깐 뒤 당첨 연출을 띄운다.
  useEffect(() => {
    if (!winnerRevealed) return;
    burstRef.current = window.setTimeout(() => setBurst(true), 900);
    return () => clearTimeout(burstRef.current);
  }, [winnerRevealed]);

  // 지오메트리
  const W = Math.max(n * 76, 260);
  const H = 400;
  const padX = 40;
  const top = 64;
  const bottom = H - 64;
  const colX = (c: number) => padX + (c * (W - 2 * padX)) / Math.max(n - 1, 1);
  const rowY = (row: number) => top + ((row + 1) * (bottom - top)) / (rungs.length + 1);
  const sortedRungs = useMemo(() => [...rungs].sort((a, b) => a.row - b.row), [rungs]);

  // 입구 i의 경로 좌표와 도착 출구 col
  const pathInfo = (entry: number) => {
    let col = entry;
    const pts: [number, number][] = [[colX(col), top]];
    for (const { row, col: rc } of sortedRungs) {
      const y = rowY(row);
      if (rc === col) {
        pts.push([colX(col), y], [colX(col + 1), y]);
        col += 1;
      } else if (rc + 1 === col) {
        pts.push([colX(col), y], [colX(col - 1), y]);
        col -= 1;
      }
    }
    pts.push([colX(col), bottom]);
    const d = pts.map((p, k) => `${k ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
    return { d, exitCol: col };
  };

  const reveal = (i: number) => {
    if (!revealed.includes(i)) setRevealed((r) => [...r, i]);
  };

  return (
    <div className="screen ladder">
      <p className="eyebrow">사다리타기</p>
      <h2 className="stage-title">
        {winnerRevealed ? '당첨을 확인했어요' : '이름을 눌러 사다리를 타세요'}
      </h2>

      <div className="ladder-scroll">
        <svg width={W} height={H} className="ladder-svg" role="img">
          {/* 세로줄 */}
          {items.map((_, i) => (
            <line key={`v${i}`} className="ladder-rail" x1={colX(i)} y1={top} x2={colX(i)} y2={bottom} />
          ))}
          {/* 가로줄 (사다리 다리) */}
          {rungs.map((r, k) => (
            <line
              key={`r${k}`}
              className="ladder-rung"
              x1={colX(r.col)}
              y1={rowY(r.row)}
              x2={colX(r.col + 1)}
              y2={rowY(r.row)}
            />
          ))}
          {/* 클릭한 참가자의 경로 트레이스 (애니메이션) */}
          {revealed.map((i) => (
            <path
              key={`p${i}`}
              className={`ladder-trace ${i === winnerIndex ? 'is-winner' : ''}`}
              d={pathInfo(i).d}
              pathLength={1}
            />
          ))}
          {/* 입구 점 */}
          {items.map((_, i) => (
            <circle key={`c${i}`} className="ladder-node" cx={colX(i)} cy={top} r={4} />
          ))}
          {/* 출구 표시: 당첨 출구(col 0)만 🎯 */}
          {items.map((_, i) => (
            <text
              key={`e${i}`}
              className="ladder-exit"
              x={colX(i)}
              y={bottom + 26}
              textAnchor="middle"
            >
              {i === 0 ? '🎯' : '·'}
            </text>
          ))}
        </svg>
      </div>

      <div className="ladder-chips">
        {items.map((label, i) => {
          const isRevealed = revealed.includes(i);
          const isWinner = i === winnerIndex;
          return (
            <button
              key={i}
              className={`chip ${isRevealed ? 'done' : ''} ${isRevealed && isWinner ? 'winner' : ''}`}
              onClick={() => reveal(i)}
              disabled={isRevealed}
            >
              {label}
              {isRevealed && (isWinner ? ' 🎯' : ' ✓')}
            </button>
          );
        })}
      </div>

      {burst && (
        <WinnerBurst
          overlay
          label={items[winnerIndex]}
          sub="님이 오늘 쏘기로 했어요 ☕"
          onRestart={onComplete}
        />
      )}
    </div>
  );
}
