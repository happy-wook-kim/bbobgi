import { useEffect, useMemo, useRef, useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

type Cell = { col: number; row: number; portalIn?: boolean };

export function Ladder({ items, winnerIndex, onComplete }: Props) {
  const n = items.length;
  const ROWS = Math.max(n * 3, 12);

  // 가로줄(다리)을 많이 + 포탈 몇 개를 랜덤 배치
  const { rungs, portals } = useMemo(() => {
    const rg: { row: number; col: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      let col = 0;
      while (col < n - 1) {
        if (Math.random() < 0.45) {
          rg.push({ row, col });
          col += 2;
        } else {
          col += 1;
        }
      }
    }
    const pt: { row: number; col: number; toCol: number }[] = [];
    const count = Math.min(n, 3);
    for (let k = 0; k < count; k++) {
      const row = 2 + Math.floor(Math.random() * Math.max(ROWS - 4, 1));
      const col = Math.floor(Math.random() * n);
      let toCol = Math.floor(Math.random() * n);
      if (toCol === col) toCol = (toCol + 1) % n;
      pt.push({ row, col, toCol });
    }
    return { rungs: rg, portals: pt };
  }, [n, ROWS]);

  const sortedRungs = useMemo(() => [...rungs].sort((a, b) => a.row - b.row), [rungs]);

  // 지오메트리
  const W = Math.max(n * 78, 260);
  const H = 180 + ROWS * 30;
  const padX = 42;
  const top = 68;
  const bottom = H - 64;
  const colX = (c: number) => padX + (c * (W - 2 * padX)) / Math.max(n - 1, 1);
  const rowY = (row: number) => top + (row * (bottom - top)) / ROWS;

  // 입구 → 출구 경로 시뮬(포탈 점프 포함, 최대 2회까지만 점프)
  const trace = (entry: number): { cells: Cell[]; exit: number } => {
    let col = entry;
    let row = 0;
    let jumps = 0;
    const cells: Cell[] = [{ col, row }];
    while (row < ROWS) {
      const rung = sortedRungs.find((r) => r.row === row && (r.col === col || r.col + 1 === col));
      if (rung) {
        col = rung.col === col ? col + 1 : col - 1;
        cells.push({ col, row });
      }
      const portal = portals.find((p) => p.row === row && p.col === col);
      if (portal && jumps < 2) {
        jumps++;
        col = portal.toCol;
        row = 0;
        cells.push({ col, row, portalIn: true });
        continue;
      }
      row++;
      cells.push({ col, row });
    }
    return { cells, exit: col };
  };

  const winnerPath = useMemo(
    () => trace(winnerIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [winnerIndex, sortedRungs, portals],
  );
  const winnerExit = winnerPath.exit;

  const [progress, setProgress] = useState(-1);
  const [burst, setBurst] = useState(false);
  const timerRef = useRef(0);
  const started = progress >= 0;
  const arrived = started && progress >= winnerPath.cells.length - 1;

  // 한 칸씩 순차 진행(살짝 느리게)
  useEffect(() => {
    if (!started || arrived) return;
    timerRef.current = window.setTimeout(() => setProgress((p) => p + 1), 240);
    return () => clearTimeout(timerRef.current);
  }, [progress, started, arrived]);

  // 도착하면 잠깐 뒤 당첨 연출
  useEffect(() => {
    if (!arrived) return;
    timerRef.current = window.setTimeout(() => setBurst(true), 900);
    return () => clearTimeout(timerRef.current);
  }, [arrived]);

  const traceD = useMemo(() => {
    if (progress < 0) return '';
    return winnerPath.cells
      .slice(0, progress + 1)
      .map((c, k) => `${k === 0 || c.portalIn ? 'M' : 'L'} ${colX(c.col)} ${rowY(c.row)}`)
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, winnerPath]);

  const marker = started
    ? winnerPath.cells[Math.min(progress, winnerPath.cells.length - 1)]
    : null;

  return (
    <div className="screen ladder">
      <p className="eyebrow">사다리타기</p>
      <h2 className="stage-title">
        {arrived ? '도착!' : started ? `${items[winnerIndex]} 출발!` : '시작을 누르세요'}
      </h2>

      <div className="ladder-scroll">
        <svg width={W} height={H} className="ladder-svg" role="img">
          {/* 세로줄 */}
          {items.map((_, i) => (
            <line key={`v${i}`} className="ladder-rail" x1={colX(i)} y1={top} x2={colX(i)} y2={bottom} />
          ))}
          {/* 가로줄 */}
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
          {/* 포탈 */}
          {portals.map((p, k) => (
            <text key={`pt${k}`} className="ladder-portal" x={colX(p.col)} y={rowY(p.row) + 7} textAnchor="middle">
              🌀
            </text>
          ))}
          {/* 진행 경로 */}
          {traceD && <path className="ladder-trace is-winner" d={traceD} fill="none" />}
          {/* 입구 이름 */}
          {items.map((label, i) => (
            <text key={`en${i}`} className="ladder-entry" x={colX(i)} y={top - 16} textAnchor="middle">
              {label}
            </text>
          ))}
          {/* 출구: 당첨자가 도달한 곳만 🎯 */}
          {items.map((_, i) => (
            <text key={`ex${i}`} className="ladder-exit" x={colX(i)} y={bottom + 28} textAnchor="middle">
              {i === winnerExit ? '🎯' : '·'}
            </text>
          ))}
          {/* 이동 마커 */}
          {marker && (
            <circle className="ladder-marker" cx={colX(marker.col)} cy={rowY(marker.row)} r={9} />
          )}
        </svg>
      </div>

      {!started && (
        <button className="btn-primary" onClick={() => setProgress(0)}>
          시작
        </button>
      )}

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
