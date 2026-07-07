import { useState } from 'react';
import type { Participant } from '../types';

type Props = {
  participants: Participant[];
  onDone: () => void;
};

export function TokenReveal({ participants, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);

  const current = participants[index];
  const isLast = index === participants.length - 1;

  const confirm = () => {
    setShown(false);
    if (isLast) {
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="screen reveal">
      <h2>{current.name} 님 차례</h2>
      {!shown ? (
        <button className="primary" onClick={() => setShown(true)}>
          내 단어 확인
        </button>
      ) : (
        <>
          <div className="token-card">{current.token}</div>
          <p className="hint">다른 사람이 보지 않게 하고 눌러주세요</p>
          <button className="primary" onClick={confirm}>
            {isLast ? '확인 · 뽑기 시작' : '확인 · 다음 사람'}
          </button>
        </>
      )}
    </div>
  );
}
