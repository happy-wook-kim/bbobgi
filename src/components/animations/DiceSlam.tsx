import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiceBody, Vec } from '../../engine/dice';
import {
  isStopped,
  randSlamCount,
  sectorMid,
  slamImpulse,
  slamInterval,
  slamPower,
  stepBody,
  zoneOf,
} from '../../engine/dice';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

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

/** 부채꼴 i의 SVG 패스 (viewBox 0~100). 중심에서 가장자리로 — 모든 구역이 합동이다. */
function sectorPath(i: number, n: number): string {
  const a0 = -Math.PI / 2 + (i * Math.PI * 2) / n;
  const a1 = -Math.PI / 2 + ((i + 1) * Math.PI * 2) / n;
  const R = 50;
  const x0 = 50 + Math.cos(a0) * R;
  const y0 = 50 + Math.sin(a0) * R;
  const x1 = 50 + Math.cos(a1) * R;
  const y1 = 50 + Math.sin(a1) * R;
  const large = 2 / n > 1 ? 1 : 0; // n=1일 때만 대호 — 실사용(n≥2)에선 0
  return `M 50 50 L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
}

export function DiceSlam({ items, onWin }: Props) {
  const n = items.length;
  // 이름표 위치: 각 부채꼴 중앙각의 반지름 66% 지점
  const labels = useMemo(
    () =>
      items.map((_, i) => {
        const mid = sectorMid(i, n);
        return { x: 0.5 + Math.cos(mid) * 0.33, y: 0.5 + Math.sin(mid) * 0.33 };
      }),
    [items, n],
  );

  const [thrown, setThrown] = useState(false);
  const [doneZone, setDoneZone] = useState(-1);
  const [pos, setPos] = useState<Vec>({ x: 0.5, y: 0.5 });
  const [slamsLeft, setSlamsLeft] = useState(0);
  const [fx, setFx] = useState<{ x: number; y: number; key: number } | null>(null);

  const bodyRef = useRef<DiceBody | null>(null);
  const slamsRef = useRef(0);
  const initialSlamsRef = useRef(0);
  const simTimeRef = useRef(0); // 시뮬레이션 누적 시간(초)
  const nextSlamAtRef = useRef(0);
  const lastFrame = useRef(0);
  const posRef = useRef<Vec>({ x: 0.5, y: 0.5 });
  const rotRef = useRef({ rx: -18, ry: 24 });
  const stateRef = useRef({ thrown: false, done: false });
  const rafRef = useRef(0);
  const wonRef = useRef(0);

  const move = (p: Vec) => {
    // 이동량에 비례해 굴러가는 회전 (탑다운 스타일 연출)
    rotRef.current.rx += (p.y - posRef.current.y) * 620;
    rotRef.current.ry += (p.x - posRef.current.x) * 620;
    posRef.current = p;
    setPos(p);
  };

  const loop = (now: number) => {
    const st = stateRef.current;
    if (st.done) return;
    // 프레임이 느려도 시뮬레이션은 실시간을 따라가도록 고정 서브스텝으로 적분한다
    let remaining = Math.min((now - lastFrame.current) / 1000, 0.25);
    lastFrame.current = now;
    let body = bodyRef.current!;
    let slammed = false;
    while (remaining > 0) {
      const h = Math.min(remaining, 1 / 60);
      remaining -= h;
      simTimeRef.current += h;
      body = stepBody(body, h);
      if (slamsRef.current > 0 && simTimeRef.current >= nextSlamAtRef.current) {
        // 예약된 시각마다 ✋ — 초반 빵빵빵, 카운트다운(마지막 5회)은 점점 세게 강타
        slamsRef.current -= 1;
        body = slamImpulse(body, Math.random, slamPower(slamsRef.current));
        nextSlamAtRef.current =
          simTimeRef.current + slamInterval(slamsRef.current, initialSlamsRef.current);
        slammed = true;
      } else if (slamsRef.current === 0 && isStopped(body)) {
        bodyRef.current = body;
        move(body.pos);
        st.done = true;
        const zone = zoneOf(body.pos, n);
        setDoneZone(zone);
        // 멈춘 구역을 눈으로 확인할 여유를 두고 결과를 알린다.
        wonRef.current = window.setTimeout(() => onWin(zone), 900);
        return;
      }
    }
    if (slammed) {
      setSlamsLeft(slamsRef.current);
      setFx({ x: body.pos.x, y: body.pos.y, key: now });
    }
    bodyRef.current = body;
    move(body.pos);
    rafRef.current = requestAnimationFrame(loop);
  };

  const throwDice = () => {
    if (stateRef.current.thrown) return;
    stateRef.current.thrown = true;
    setThrown(true);
    const start = { x: 0.4 + Math.random() * 0.2, y: 0.4 + Math.random() * 0.2 };
    posRef.current = start;
    setPos(start);
    const a = Math.random() * Math.PI * 2;
    const mag = 1.1 + Math.random() * 0.6;
    bodyRef.current = { pos: start, vel: { x: Math.cos(a) * mag, y: Math.sin(a) * mag } };
    slamsRef.current = randSlamCount();
    initialSlamsRef.current = slamsRef.current;
    simTimeRef.current = 0;
    nextSlamAtRef.current = slamInterval(slamsRef.current, slamsRef.current);
    setSlamsLeft(slamsRef.current);
    lastFrame.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(wonRef.current);
    },
    [],
  );

  const done = doneZone >= 0;
  const { rx, ry } = rotRef.current;

  return (
    <div className="screen dice">
      <p className="eyebrow">주사위</p>
      <h2 className="stage-title">
        {done ? items[doneZone] : thrown ? '✋가 알아서 내려칩니다!' : '주사위를 던지세요'}
      </h2>

      {thrown && !done && (
        <p
          className={`dice-count ${slamsLeft <= 5 && slamsLeft > 0 ? 'is-final' : ''}`}
          key={slamsLeft}
        >
          {slamsLeft > 5 ? (
            <>
              ✋ 남은 손바닥 <b>{slamsLeft}</b>번
            </>
          ) : slamsLeft > 0 ? (
            // 마지막 5회: 5-4-3-2-1 카운트다운 — 숫자가 점점 커지며 빵! 빵!
            <b style={{ fontSize: `${28 + (5 - slamsLeft) * 9}px` }}>{slamsLeft}</b>
          ) : (
            '이제 멈춥니다…'
          )}
        </p>
      )}

      <div className="dice-board">
        <svg className="dice-sectors" viewBox="0 0 100 100" aria-hidden>
          {done && <path d={sectorPath(doneZone, n)} className="dice-sector-hit" />}
          {items.map((_, i) => {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
            return (
              <line
                key={i}
                className="dice-sector-line"
                x1={50}
                y1={50}
                x2={50 + Math.cos(a) * 50}
                y2={50 + Math.sin(a) * 50}
              />
            );
          })}
        </svg>

        {items.map((name, i) => (
          <span
            key={i}
            className="dice-name"
            style={{
              left: `${labels[i].x * 100}%`,
              top: `${labels[i].y * 100}%`,
              color: ZONE_COLORS[i % ZONE_COLORS.length],
            }}
          >
            {name}
          </span>
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
              className="dice-wrap"
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
