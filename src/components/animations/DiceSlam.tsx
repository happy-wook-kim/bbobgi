import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiceBody, Vec } from '../../engine/dice';
import {
  isStopped,
  randSlamCount,
  slamImpulse,
  slamInterval,
  stepBody,
  zoneOf,
  zoneRects,
} from '../../engine/dice';

type Props = {
  items: string[];
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

export function DiceSlam({ items, onWin }: Props) {
  const n = items.length;
  const zones = useMemo(() => zoneRects(n), [n]);

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
        // 예약된 시각마다 ✋가 자동으로 내려친다 — 초반 빵빵빵, 마지막 5회는 카운트다운 페이스
        body = slamImpulse(body);
        slamsRef.current -= 1;
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
    const start = { x: 0.35 + Math.random() * 0.3, y: 0.35 + Math.random() * 0.3 };
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
