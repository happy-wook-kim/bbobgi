import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiceBody, DicePath, Vec } from '../../engine/dice';
import {
  isStopped,
  pathPosAt,
  planPath,
  slamImpulse,
  stepBody,
  zoneOf,
  zoneRects,
} from '../../engine/dice';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

type Mode = 'steer' | 'physics';

const ZONE_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1',
  '#c2185b', '#fbc02d', '#5e35b1', '#00897b', '#d81b60', '#3949ab',
];

// 3×3 격자에서 눈금(pip)이 켜지는 칸
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const FACES = [
  { v: 1, tf: 'rotateY(0deg) translateZ(22px)' },
  { v: 6, tf: 'rotateY(180deg) translateZ(22px)' },
  { v: 3, tf: 'rotateY(90deg) translateZ(22px)' },
  { v: 4, tf: 'rotateY(-90deg) translateZ(22px)' },
  { v: 2, tf: 'rotateX(90deg) translateZ(22px)' },
  { v: 5, tf: 'rotateX(-90deg) translateZ(22px)' },
];

const SLAM_COOLDOWN = 160; // 연타 폭주 방지(ms)

export function DiceSlam({ items, winnerIndex, onWin }: Props) {
  const n = items.length;
  const zones = useMemo(() => zoneRects(n), [n]);

  const [mode, setMode] = useState<Mode>('steer');
  const [thrown, setThrown] = useState(false);
  const [doneZone, setDoneZone] = useState(-1);
  const [pos, setPos] = useState<Vec>({ x: 0.5, y: 0.5 });
  const [fx, setFx] = useState<{ x: number; y: number; key: number } | null>(null);

  const modeRef = useRef<Mode>('steer');
  const pathRef = useRef<DicePath | null>(null);
  const pathT0 = useRef(0);
  const bodyRef = useRef<DiceBody | null>(null);
  const lastFrame = useRef(0);
  const posRef = useRef<Vec>({ x: 0.5, y: 0.5 });
  const rotRef = useRef({ rx: -18, ry: 24 });
  const stateRef = useRef({ thrown: false, done: false, lastSlam: 0 });
  const rafRef = useRef(0);
  const wonRef = useRef(0);

  const move = (p: Vec) => {
    // 이동량에 비례해 굴러가는 회전 (탑다운 스타일 연출)
    rotRef.current.rx += (p.y - posRef.current.y) * 620;
    rotRef.current.ry += (p.x - posRef.current.x) * 620;
    posRef.current = p;
    setPos(p);
  };

  const stop = (zone: number) => {
    stateRef.current.done = true;
    setDoneZone(zone);
    // 멈춘 구역을 눈으로 확인할 여유를 두고 결과를 알린다.
    wonRef.current = window.setTimeout(() => onWin(zone), 900);
  };

  const loop = (now: number) => {
    const st = stateRef.current;
    if (st.done) return;
    if (modeRef.current === 'steer') {
      const path = pathRef.current!;
      const t = (now - pathT0.current) / 1000;
      move(pathPosAt(path, t));
      if (t >= path.pts[path.pts.length - 1].t) {
        stop(winnerIndex); // 확정 모드: 목표 구역 = 걸린 사람
        return;
      }
    } else {
      const dt = Math.min((now - lastFrame.current) / 1000, 0.05);
      lastFrame.current = now;
      bodyRef.current = stepBody(bodyRef.current!, dt);
      move(bodyRef.current.pos);
      if (isStopped(bodyRef.current)) {
        stop(zoneOf(bodyRef.current.pos, n)); // 물리 모드: 멈춘 자리
        return;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const throwDice = () => {
    if (stateRef.current.thrown) return;
    stateRef.current.thrown = true;
    setThrown(true);
    const start = { x: 0.35 + Math.random() * 0.3, y: 0.35 + Math.random() * 0.3 };
    posRef.current = start;
    setPos(start);
    if (modeRef.current === 'steer') {
      pathRef.current = planPath(start, winnerIndex, n);
      pathT0.current = performance.now();
    } else {
      const a = Math.random() * Math.PI * 2;
      const mag = 1.1 + Math.random() * 0.6;
      bodyRef.current = { pos: start, vel: { x: Math.cos(a) * mag, y: Math.sin(a) * mag } };
      lastFrame.current = performance.now();
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const slam = () => {
    const st = stateRef.current;
    const now = performance.now();
    if (!st.thrown || st.done || now - st.lastSlam < SLAM_COOLDOWN) return;
    st.lastSlam = now;
    setFx({ x: posRef.current.x, y: posRef.current.y, key: now });
    if (modeRef.current === 'steer') {
      // 반동으로 튀어 오르되 목적지(걸린 사람 구역)는 그대로 — 결과 불변
      pathRef.current = planPath(posRef.current, winnerIndex, n);
      pathT0.current = now;
    } else {
      bodyRef.current = slamImpulse(bodyRef.current!);
    }
  };

  const slamRef = useRef(slam);
  slamRef.current = slam;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        slamRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(wonRef.current);
    };
  }, []);

  const done = doneZone >= 0;
  const { rx, ry } = rotRef.current;

  return (
    <div className="screen dice">
      <p className="eyebrow">주사위</p>
      <h2 className="stage-title">
        {done ? items[doneZone] : thrown ? 'Space 키나 화면을 쳐보세요!' : '주사위를 던지세요'}
      </h2>

      <div className="dice-modes" role="group" aria-label="모드 선택">
        <button
          className={`dice-mode ${mode === 'steer' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('steer');
            modeRef.current = 'steer';
          }}
          disabled={thrown}
        >
          🎯 확정 모드
        </button>
        <button
          className={`dice-mode ${mode === 'physics' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('physics');
            modeRef.current = 'physics';
          }}
          disabled={thrown}
        >
          🌪 물리 모드
        </button>
      </div>

      <div className="dice-board" onPointerDown={() => slamRef.current()}>
        {zones.map((r, i) => (
          <div
            key={i}
            className={`dice-zone ${done && i === doneZone ? 'is-loser' : ''}`}
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
            }}
          >
            <span style={{ color: ZONE_COLORS[i % ZONE_COLORS.length] }}>{items[i]}</span>
          </div>
        ))}

        {thrown && (
          <>
            <span
              className="dice-shadow"
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
              aria-hidden
            />
            <span
              key={fx?.key ?? 0} /* 슬램마다 remount → 홉(튀어오름) 애니메이션 재생 */
              className={`dice-wrap ${done ? '' : 'is-rolling'}`}
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
              aria-hidden
            >
              <span
                className="dice-cube"
                style={{ transform: `rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)` }}
              >
                {FACES.map((f) => (
                  <span key={f.v} className="dice-face" style={{ transform: f.tf }}>
                    {Array.from({ length: 9 }, (_, c) => (
                      <i key={c} className={PIPS[f.v].includes(c) ? 'on' : ''} />
                    ))}
                  </span>
                ))}
              </span>
            </span>
          </>
        )}

        {fx && (
          <span key={fx.key} className="slam-fx" style={{ left: `${fx.x * 100}%`, top: `${fx.y * 100}%` }} aria-hidden>
            <i className="slam-ring" />
            <i className="slam-hand">✋</i>
          </span>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={throwDice}
        disabled={thrown}
        style={{ visibility: thrown ? 'hidden' : 'visible' }}
      >
        던지기
      </button>
    </div>
  );
}
