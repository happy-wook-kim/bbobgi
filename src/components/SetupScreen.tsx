import { useState } from 'react';
import type { Mode } from '../types';

type Props = {
  onStart: (names: string[], mode: Mode, outcomeLabels: string[]) => void;
};

export function SetupScreen({ onStart }: Props) {
  const [names, setNames] = useState<string[]>(['', '']);
  const [mode, setMode] = useState<Mode>('single');
  const [outcomes, setOutcomes] = useState<string[]>(['', '']);

  const trimmedNames = names.map((n) => n.trim()).filter(Boolean);
  const trimmedOutcomes = outcomes.map((o) => o.trim()).filter(Boolean);
  const canStart = trimmedNames.length >= 2 && (mode === 'single' || trimmedOutcomes.length >= 1);

  const setAt = (list: string[], i: number, v: string) =>
    list.map((x, idx) => (idx === i ? v : x));

  return (
    <div className="screen setup">
      <h1>🎲 뽑기</h1>

      <section>
        <h2>참가자</h2>
        {names.map((name, i) => (
          <input
            key={i}
            placeholder="참가자 이름"
            value={name}
            onChange={(e) => setNames(setAt(names, i, e.target.value))}
          />
        ))}
        <button type="button" onClick={() => setNames([...names, ''])}>
          + 참가자 추가
        </button>
      </section>

      <section>
        <h2>모드</h2>
        <label>
          <input
            type="radio"
            checked={mode === 'single'}
            onChange={() => setMode('single')}
          />
          한 명 당첨
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'assign'}
            onChange={() => setMode('assign')}
          />
          각자 배정
        </label>
      </section>

      {mode === 'assign' && (
        <section>
          <h2>결과 항목</h2>
          {outcomes.map((oc, i) => (
            <input
              key={i}
              placeholder="결과 (예: 전액)"
              value={oc}
              onChange={(e) => setOutcomes(setAt(outcomes, i, e.target.value))}
            />
          ))}
          <button type="button" onClick={() => setOutcomes([...outcomes, ''])}>
            + 결과 추가
          </button>
        </section>
      )}

      <button
        className="primary"
        disabled={!canStart}
        onClick={() => onStart(trimmedNames, mode, mode === 'assign' ? trimmedOutcomes : [])}
      >
        시작
      </button>
    </div>
  );
}
