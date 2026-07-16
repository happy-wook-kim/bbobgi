import { useEffect, useMemo, useRef, useState } from 'react';
import { assignCards, spinPlan } from '../../engine/cardSlot';
import { playerColor } from '../../palette';
import { PlayerName } from '../PlayerName';
import { Burst } from '../Burst';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

export function CardDraw({ items, winnerIndex, onWin }: Props) {
  const n = items.length;
  // 참가자 순서대로 뽑을 카드를 미리 배정한다. 🎯 카드 = 걸린 사람(winnerIndex) 몫 — 슬롯은 연출.
  const cardOf = useMemo(() => assignCards(n), [n]);
  const targetCard = cardOf[winnerIndex];

  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState(-1); // 지금 뽑는 참가자
  const [focus, setFocus] = useState(-1); // 포커스(굵은 테두리) 카드
  const [flippedBy, setFlippedBy] = useState<Record<number, number>>({}); // 카드 → 뽑은 사람
  const [done, setDone] = useState(false);
  const timersRef = useRef<number[]>([]);

  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  /** t번째 참가자의 슬롯 스핀 → 배정 카드에 멈춤 → 뒤집기 → 다음 차례/종료 */
  const runTurn = (t: number, used: number[]) => {
    setTurn(t);
    const available = cardOf.map((_, c) => c).filter((c) => !used.includes(c));
    const card = cardOf[t];
    const { path, delays } = spinPlan(available, card);
    let acc = 300; // 차례 시작 후 잠깐 숨 고르기
    path.forEach((c, i) => {
      acc += delays[i];
      after(acc, () => setFocus(c));
    });
    after(acc + 420, () => {
      // 멈춘 카드를 즉시 뒤집는다
      setFlippedBy((prev) => ({ ...prev, [card]: t }));
      if (t === winnerIndex) {
        setDone(true);
        // 🎯 확인할 여유를 두고 결과를 알린다.
        after(1600, () => onWin(winnerIndex));
      } else {
        after(1400, () => runTurn(t + 1, [...used, card]));
      }
    });
  };

  const start = () => {
    if (started) return;
    setStarted(true);
    runTurn(0, []);
  };

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  return (
    <div className="screen cards">
      <p className="eyebrow">카드 뽑기</p>
      <h2 className="stage-title">
        {done ? (
          <PlayerName i={winnerIndex}>{items[winnerIndex]}</PlayerName>
        ) : started && turn >= 0 ? (
          <>
            <PlayerName i={turn}>{items[turn]}</PlayerName> 차례
          </>
        ) : (
          '시작을 누르세요'
        )}
      </h2>
      <div className="card-grid">
        {items.map((_, card) => {
          const by = flippedBy[card];
          const isFlipped = by !== undefined;
          const isWinner = card === targetCard;
          return (
            <div key={card} className="card-slot">
              <div
                className={`flip-card ${isFlipped ? 'is-flipped' : ''} ${
                  isFlipped && isWinner ? 'is-winner' : ''
                } ${focus === card && !isFlipped ? 'is-focus' : ''}`}
              >
                <span className="flip-inner">
                  <span className="flip-face flip-back" aria-hidden>
                    ?
                  </span>
                  <span className="flip-face flip-front">
                    {isWinner ? (
                      <span style={{ color: 'initial' }}>🎯</span>
                    ) : (
                      <svg className="mark-x" viewBox="0 0 100 100" aria-hidden>
                        <line x1="26" y1="26" x2="74" y2="74" />
                        <line x1="74" y1="26" x2="26" y2="74" />
                      </svg>
                    )}
                  </span>
                </span>
                {isFlipped && isWinner && <Burst />}
              </div>
              <span className="card-owner" style={{ color: playerColor(by ?? 0) }}>
                {isFlipped ? items[by] : ' '}
              </span>
            </div>
          );
        })}
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
