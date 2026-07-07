import { useEffect, useMemo, useRef, useState } from 'react';
import { WinnerBurst } from '../WinnerBurst';

type Props = {
  items: string[];
  winnerIndex: number;
  onComplete: () => void;
};

type Cell = { col: number; row: number; portalIn?: boolean };
type Portal = { row: number; col: number };
type Pair = { a: Portal; b: Portal; color: string };

const PORTAL_COLORS = ['#2979ff', '#aa00ff', '#00b8d4', '#ff4081'];
// 참가자별 고유 색(경로·마커에 사용)
const PLAYER_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1',
  '#c2185b', '#fbc02d', '#5e35b1', '#00897b', '#d81b60', '#3949ab',
];

export function Ladder({ items, winnerIndex, onComplete }: Props) {
  const n = items.length;
  const ROWS = Math.max(n * 3, 12);

  // 가로줄 + 포탈 쌍 랜덤 생성
  const { rungs, pairs } = useMemo(() => {
    // 포탈 쌍을 먼저 배치한다
    const pairCount = Math.min(2, PORTAL_COLORS.length);
    const pr: Pair[] = [];
    const taken = new Set<string>();
    const spot = (): Portal => {
      for (let tries = 0; tries < 30; tries++) {
        const row = 2 + Math.floor(Math.random() * Math.max(ROWS - 4, 1));
        const col = Math.floor(Math.random() * n);
        const key = `${row},${col}`;
        if (!taken.has(key)) {
          taken.add(key);
          return { row, col };
        }
      }
      return { row: 2, col: 0 };
    };
    for (let k = 0; k < pairCount; k++) {
      pr.push({ a: spot(), b: spot(), color: PORTAL_COLORS[k] });
    }
    const portalCells = new Set<string>();
    pr.forEach((p) => {
      portalCells.add(`${p.a.row},${p.a.col}`);
      portalCells.add(`${p.b.row},${p.b.col}`);
    });

    // 가로줄: 포탈이 있는 칸은 건드리지 않는다(경로가 포탈을 안 새고 반드시 타도록)
    const rg: { row: number; col: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      let col = 0;
      while (col < n - 1) {
        const hitsPortal =
          portalCells.has(`${row},${col}`) || portalCells.has(`${row},${col + 1}`);
        if (!hitsPortal && Math.random() < 0.45) {
          rg.push({ row, col });
          col += 2;
        } else {
          col += 1;
        }
      }
    }
    return { rungs: rg, pairs: pr };
  }, [n, ROWS]);

  const sortedRungs = useMemo(() => [...rungs].sort((a, b) => a.row - b.row), [rungs]);
  const portalMap = useMemo(() => {
    const m = new Map<string, Portal>();
    pairs.forEach((p) => {
      m.set(`${p.a.row},${p.a.col}`, p.b);
      m.set(`${p.b.row},${p.b.col}`, p.a);
    });
    return m;
  }, [pairs]);

  // 지오메트리
  const W = Math.max(n * 78, 260);
  const H = 180 + ROWS * 30;
  const padX = 42;
  const top = 68;
  const bottom = H - 64;
  const colX = (c: number) => padX + (c * (W - 2 * padX)) / Math.max(n - 1, 1);
  const rowY = (row: number) => top + (row * (bottom - top)) / ROWS;

  // 입구 → 출구 경로(포탈 쌍 순간이동, 왕복/무한루프 방지)
  const trace = (entry: number): { cells: Cell[]; exit: number } => {
    let col = entry;
    let row = 0;
    let usedPortal = false; // 포탈은 경로당 한 번만 — 탄 뒤로는 포탈이 없다
    const cells: Cell[] = [{ col, row }];
    while (row < ROWS) {
      const rung = sortedRungs.find((r) => r.row === row && (r.col === col || r.col + 1 === col));
      if (rung) {
        col = rung.col === col ? col + 1 : col - 1;
        cells.push({ col, row });
      }
      const dest = portalMap.get(`${row},${col}`);
      if (dest && !usedPortal) {
        usedPortal = true;
        col = dest.col;
        row = dest.row;
        cells.push({ col, row, portalIn: true });
        continue;
      }
      row++;
      cells.push({ col, row });
    }
    return { cells, exit: col };
  };

  const allPaths = useMemo(
    () => items.map((_, i) => trace(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, sortedRungs, portalMap],
  );
  const winnerExit = allPaths[winnerIndex]?.exit ?? 0;

  const [pIdx, setPIdx] = useState(-1); // 현재 움직이는 참가자(-1: 시작 전)
  const [t, setT] = useState(0); // 현재 참가자의 진행량(0~total)
  const [burst, setBurst] = useState(false);
  const rafRef = useRef(0);
  const burstRef = useRef(0);
  const stRef = useRef({ pIdx: 0, start: 0 });
  const started = pIdx >= 0;
  const SPEED = 7; // 초당 진행 칸수

  const loop = (now: number) => {
    const st = stRef.current;
    const cells = allPaths[st.pIdx].cells;
    const total = cells.length - 1;
    const tt = ((now - st.start) / 1000) * SPEED;
    if (tt >= total) {
      if (st.pIdx + 1 < n) {
        // 다음 참가자로
        stRef.current = { pIdx: st.pIdx + 1, start: now };
        setPIdx(st.pIdx + 1);
        setT(0);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setT(total);
        burstRef.current = window.setTimeout(() => setBurst(true), 900);
      }
    } else {
      setT(tt);
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  const start = () => {
    if (started) return;
    stRef.current = { pIdx: 0, start: performance.now() };
    setPIdx(0);
    setT(0);
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(burstRef.current);
    },
    [],
  );

  const pathD = (cells: Cell[], upto?: number) => {
    const slice = upto === undefined ? cells : cells.slice(0, upto + 1);
    return slice
      .map((c, k) => `${k === 0 || c.portalIn ? 'M' : 'L'} ${colX(c.col)} ${rowY(c.row)}`)
      .join(' ');
  };

  // 현재 참가자 마커와 부분 트레이스(마커까지 이어짐)
  let mx = 0;
  let my = 0;
  let curD = '';
  if (started && pIdx < n) {
    const cells = allPaths[pIdx].cells;
    const total = cells.length - 1;
    const idx = Math.min(Math.floor(t), total);
    const cur = cells[idx];
    const nxt = cells[idx + 1];
    const frac = t - idx;
    const interp = nxt && !nxt.portalIn; // 포탈 점프는 순간이동
    mx = interp ? colX(cur.col) + (colX(nxt.col) - colX(cur.col)) * frac : colX(cur.col);
    my = interp ? rowY(cur.row) + (rowY(nxt.row) - rowY(cur.row)) * frac : rowY(cur.row);
    curD = pathD(cells, idx);
    if (interp && frac > 0) curD += ` L ${mx} ${my}`;
  }

  const doneCount = started ? pIdx : 0; // 0..pIdx-1 은 완주 완료

  return (
    <div className="screen ladder">
      <p className="eyebrow">사다리타기</p>
      <h2 className="stage-title">
        {burst ? '도착!' : started && pIdx < n ? `${items[pIdx]} 차례` : '시작을 누르세요'}
      </h2>

      <div className="ladder-scroll">
        <svg width={W} height={H} className="ladder-svg" role="img">
          {items.map((_, i) => (
            <line key={`v${i}`} className="ladder-rail" x1={colX(i)} y1={top} x2={colX(i)} y2={bottom} />
          ))}
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
          {/* 포탈 쌍(같은 색끼리 연결) */}
          {pairs.map((p, k) => (
            <g key={`pt${k}`}>
              <circle className="ladder-portal-dot" cx={colX(p.a.col)} cy={rowY(p.a.row)} r={12} fill="#fff" stroke={p.color} />
              <circle className="ladder-portal-dot" cx={colX(p.b.col)} cy={rowY(p.b.row)} r={12} fill="#fff" stroke={p.color} />
            </g>
          ))}
          {/* 완주한 참가자 경로 */}
          {Array.from({ length: doneCount }).map((_, i) => (
            <path
              key={`done${i}`}
              className={`ladder-trace ${i === winnerIndex ? 'is-winner' : ''}`}
              d={pathD(allPaths[i].cells)}
              fill="none"
              stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
              opacity={0.5}
            />
          ))}
          {/* 현재 참가자 경로 */}
          {curD && (
            <path
              className={`ladder-trace ${pIdx === winnerIndex ? 'is-winner' : ''}`}
              d={curD}
              fill="none"
              stroke={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}
              opacity={0.95}
            />
          )}
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
          {started && pIdx < n && (
            <circle
              className="ladder-marker"
              cx={mx}
              cy={my}
              r={9}
              fill={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}
            />
          )}
        </svg>
      </div>

      {!started && (
        <button className="btn-primary" onClick={start}>
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
