import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PLAYER_COLORS, playerColor } from '../../palette';
import { PlayerName } from '../PlayerName';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

type Cell = { col: number; row: number; portalIn?: boolean };
type Portal = { row: number; col: number };
type Pair = { a: Portal; b: Portal; color: string };
type Rung = { row: number; col: number };

const PORTAL_COLORS = ['#2979ff', '#aa00ff', '#00b8d4', '#ff4081'];

/** 입구 → 출구 경로. 아직 안 쓴 포탈은 만나면 반드시 탄다(탄 쌍은 재사용 금지). */
function tracePath(
  entry: number,
  sortedRungs: Rung[],
  portalMap: Map<string, Portal>,
  ROWS: number,
): { cells: Cell[]; exit: number } {
  let col = entry;
  let row = 0;
  const usedPortals = new Set<string>();
  const cells: Cell[] = [{ col, row }];
  while (row < ROWS) {
    const rung = sortedRungs.find((r) => r.row === row && (r.col === col || r.col + 1 === col));
    if (rung) {
      col = rung.col === col ? col + 1 : col - 1;
      cells.push({ col, row });
    }
    const key = `${row},${col}`;
    const dest = portalMap.get(key);
    if (dest && !usedPortals.has(key)) {
      usedPortals.add(key);
      usedPortals.add(`${dest.row},${dest.col}`);
      col = dest.col;
      row = dest.row;
      cells.push({ col, row, portalIn: true });
      continue;
    }
    row++;
    cells.push({ col, row });
  }
  return { cells, exit: col };
}

export function Ladder({ items, winnerIndex, onWin }: Props) {
  const n = items.length;
  const ROWS = Math.max(n * 3, 12);

  // 모든 참가자가 서로 다른 출구에 도착하는(전단사) 배치만 채택
  const { rungs, pairs } = useMemo(() => {
    const buildPortals = (): Pair[] => {
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
      return pr;
    };

    const buildRungs = (portalCells: Set<string>): Rung[] => {
      const rg: Rung[] = [];
      for (let row = 0; row < ROWS; row++) {
        let col = 0;
        while (col < n - 1) {
          const hits = portalCells.has(`${row},${col}`) || portalCells.has(`${row},${col + 1}`);
          if (!hits && Math.random() < 0.45) {
            rg.push({ row, col });
            col += 2;
          } else {
            col += 1;
          }
        }
      }
      return rg;
    };

    const bijective = (rg: Rung[], pr: Pair[]) => {
      const sr = [...rg].sort((a, b) => a.row - b.row);
      const pm = new Map<string, Portal>();
      pr.forEach((p) => {
        pm.set(`${p.a.row},${p.a.col}`, p.b);
        pm.set(`${p.b.row},${p.b.col}`, p.a);
      });
      const exits = items.map((_, i) => tracePath(i, sr, pm, ROWS).exit);
      return new Set(exits).size === n;
    };

    for (let attempt = 0; attempt < 40; attempt++) {
      const pr = buildPortals();
      const portalCells = new Set<string>();
      pr.forEach((p) => {
        portalCells.add(`${p.a.row},${p.a.col}`);
        portalCells.add(`${p.b.row},${p.b.col}`);
      });
      const rg = buildRungs(portalCells);
      if (bijective(rg, pr)) return { rungs: rg, pairs: pr };
    }
    return { rungs: buildRungs(new Set()), pairs: [] as Pair[] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ROWS, items]);

  const sortedRungs = useMemo(() => [...rungs].sort((a, b) => a.row - b.row), [rungs]);
  const portalMap = useMemo(() => {
    const m = new Map<string, Portal>();
    pairs.forEach((p) => {
      m.set(`${p.a.row},${p.a.col}`, p.b);
      m.set(`${p.b.row},${p.b.col}`, p.a);
    });
    return m;
  }, [pairs]);

  const W = Math.max(n * 78, 260);
  const H = 180 + ROWS * 30;
  const padX = 42;
  const top = 68;
  const bottom = H - 64;
  const colX = (c: number) => padX + (c * (W - 2 * padX)) / Math.max(n - 1, 1);
  const rowY = (row: number) => top + (row * (bottom - top)) / ROWS;

  const allPaths = useMemo(
    () => items.map((_, i) => tracePath(i, sortedRungs, portalMap, ROWS)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, sortedRungs, portalMap, ROWS],
  );
  const winnerExit = allPaths[winnerIndex]?.exit ?? 0;

  const [pIdx, setPIdx] = useState(-1);
  const [t, setT] = useState(0);
  const [arrived, setArrived] = useState(false); // 전원 완료
  const [winnerArrived, setWinnerArrived] = useState(false); // 당첨자가 🎯 도달
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const d = 42 + Math.random() * 72;
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          delay: Math.random() * 0.08,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        };
      }),
    [],
  );
  const rafRef = useRef(0);
  const wonRef = useRef(0);
  const stRef = useRef({ pIdx: 0, start: 0 });
  const started = pIdx >= 0;
  const SPEED = 7;

  const loop = (now: number) => {
    const st = stRef.current;
    const path = allPaths[st.pIdx];
    if (!path) return;
    const cells = path.cells;
    const total = cells.length - 1;
    const tt = ((now - st.start) / 1000) * SPEED;
    if (tt >= total) {
      if (st.pIdx === winnerIndex) setWinnerArrived(true);
      if (st.pIdx + 1 < n) {
        stRef.current = { pIdx: st.pIdx + 1, start: now };
        setPIdx(st.pIdx + 1);
        setT(0);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setT(total);
        setArrived(true);
        wonRef.current = window.setTimeout(() => onWin(winnerIndex), 900);
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
      clearTimeout(wonRef.current);
    },
    [],
  );

  const pathD = (cells: Cell[], upto?: number) => {
    const slice = upto === undefined ? cells : cells.slice(0, upto + 1);
    return slice
      .map((c, k) => `${k === 0 || c.portalIn ? 'M' : 'L'} ${colX(c.col)} ${rowY(c.row)}`)
      .join(' ');
  };

  let mx = 0;
  let my = 0;
  let curD = '';
  if (started && pIdx < n && allPaths[pIdx]) {
    const cells = allPaths[pIdx].cells;
    const total = cells.length - 1;
    const idx = Math.max(0, Math.min(Math.floor(t), total));
    const cur = cells[idx];
    if (cur) {
      const nxt = cells[idx + 1];
      const frac = t - idx;
      const interp = nxt && !nxt.portalIn;
      mx = interp ? colX(cur.col) + (colX(nxt.col) - colX(cur.col)) * frac : colX(cur.col);
      my = interp ? rowY(cur.row) + (rowY(nxt.row) - rowY(cur.row)) * frac : rowY(cur.row);
      curD = pathD(cells, idx);
      if (interp && frac > 0) curD += ` L ${mx} ${my}`;
    }
  }

  const doneCount = started ? pIdx : 0;

  return (
    <div className="screen ladder">
      <p className="eyebrow">사다리타기</p>
      <h2 className="stage-title">
        {arrived ? (
          '도착!'
        ) : started && pIdx < n ? (
          <>
            <PlayerName i={pIdx}>{items[pIdx]}</PlayerName> 차례
          </>
        ) : (
          '시작을 누르세요'
        )}
      </h2>

      <div className="ladder-scroll">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="ladder-svg" role="img">
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
          {pairs.map((p, k) => (
            <g key={`pt${k}`}>
              <circle className="ladder-portal-dot" cx={colX(p.a.col)} cy={rowY(p.a.row)} r={12} fill="#fff" stroke={p.color} />
              <circle className="ladder-portal-dot" cx={colX(p.b.col)} cy={rowY(p.b.row)} r={12} fill="#fff" stroke={p.color} />
            </g>
          ))}
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
          {curD && (
            <path
              className={`ladder-trace ${pIdx === winnerIndex ? 'is-winner' : ''}`}
              d={curD}
              fill="none"
              stroke={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}
              opacity={0.95}
            />
          )}
          {items.map((label, i) => (
            <text
              key={`en${i}`}
              className="ladder-entry"
              x={colX(i)}
              y={top - 16}
              textAnchor="middle"
              fill={playerColor(i)}
            >
              {label}
            </text>
          ))}
          {items.map((_, i) => (
            <text
              key={`ex${i}`}
              className={`ladder-exit ${i === winnerExit ? 'is-target' : ''}`}
              x={colX(i)}
              y={bottom + 30}
              textAnchor="middle"
            >
              {i === winnerExit ? '🎯' : '·'}
            </text>
          ))}
          {started && pIdx < n && (
            <circle
              className="ladder-marker"
              cx={mx}
              cy={my}
              r={9}
              fill={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}
            />
          )}
          {winnerArrived &&
            confettiPieces.map((p, k) => (
              <circle
                key={`cf${k}`}
                className="ladder-confetti-piece"
                cx={colX(winnerExit)}
                cy={bottom + 20}
                r={5}
                fill={p.color}
                style={
                  { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}s` } as CSSProperties
                }
              />
            ))}
        </svg>
      </div>

      <button
        className="btn-primary"
        onClick={start}
        disabled={started}
        style={{ visibility: started ? 'hidden' : 'visible' }}
      >
        시작
      </button>
    </div>
  );
}
