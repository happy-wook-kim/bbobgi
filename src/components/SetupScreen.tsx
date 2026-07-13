import { useState } from 'react';
import type { AnimationKind } from '../types';
import { assignTokens } from '../engine/tokens';

type SetupOption = AnimationKind | 'random';

type Props = {
  option: SetupOption;
  onStart: (items: string[]) => void;
  onBack: () => void;
};

const OPTION_LABEL: Record<SetupOption, string> = {
  card: '카드 뽑기',
  roulette: '룰렛',
  ladder: '사다리타기',
  horse: '경마',
  random: '랜덤',
};

export function SetupScreen({ option, onStart, onBack }: Props) {
  return (
    <div className="screen setup">
      <button className="btn-ghost back" onClick={onBack}>
        ← 게임 바꾸기
      </button>
      <p className="eyebrow">{OPTION_LABEL[option]}</p>
      {option === 'card' ? <CardSetup onStart={onStart} /> : <NameSetup onStart={onStart} />}
    </div>
  );
}

function CardSetup({ onStart }: { onStart: (items: string[]) => void }) {
  const [count, setCount] = useState(3);
  return (
    <>
      <h1 className="setup-title">몇 명이 뽑나요?</h1>
      <div className="stepper">
        <button
          className="step-btn"
          onClick={() => setCount((c) => Math.max(2, c - 1))}
          disabled={count <= 2}
          aria-label="한 명 줄이기"
        >
          −
        </button>
        <span className="step-count">{count}</span>
        <button
          className="step-btn"
          onClick={() => setCount((c) => Math.min(12, c + 1))}
          disabled={count >= 12}
          aria-label="한 명 늘리기"
        >
          +
        </button>
      </div>
      <p className="hint">{count}장의 카드가 깔려요. 각자 한 장씩 뽑으세요.</p>
      <button className="btn-primary" onClick={() => onStart(assignTokens(count))}>
        카드 깔기
      </button>
    </>
  );
}

function NameSetup({ onStart }: { onStart: (items: string[]) => void }) {
  const [names, setNames] = useState<string[]>(['', '']);
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  const canStart = trimmed.length >= 2;

  return (
    <>
      <h1 className="setup-title">누가 참여하나요?</h1>
      <button className="btn-ghost" onClick={() => setNames((ns) => [...ns, ''])}>
        + 참가자 추가
      </button>
      <div className="name-list">
        {names.map((name, i) => (
          <input
            key={i}
            className="name-input"
            placeholder={`참가자 ${i + 1}`}
            value={name}
            onChange={(e) =>
              setNames((ns) => ns.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
        ))}
      </div>
      <button className="btn-primary" disabled={!canStart} onClick={() => onStart(trimmed)}>
        시작
      </button>
    </>
  );
}
