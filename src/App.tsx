import { useState } from 'react';
import type { AnimationKind, Step } from './types';
import { pickWinner } from './engine/pick';
import { ChooseAnimation } from './components/ChooseAnimation';
import { SetupScreen } from './components/SetupScreen';
import { CardDraw } from './components/animations/CardDraw';
import { Roulette } from './components/animations/Roulette';
import { Ladder } from './components/animations/Ladder';

export default function App() {
  const [step, setStep] = useState<Step>('choose');
  const [kind, setKind] = useState<AnimationKind | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [round, setRound] = useState(0); // 한번 더 할 때마다 증가 → 연출 remount

  const handleChoose = (chosen: AnimationKind) => {
    setKind(chosen);
    setStep('setup');
  };

  // 카드: assignTokens로 만든 토큰 items. 룰렛·사다리: 입력한 이름 items.
  const handleStart = (nextItems: string[]) => {
    setItems(nextItems);
    setWinnerIndex(pickWinner(nextItems.length));
    setRound(0);
    setStep('animate');
  };

  const toHome = () => {
    setKind(null);
    setItems([]);
    setWinnerIndex(-1);
    setStep('choose');
  };

  // 한번 더: 참가자는 그대로, 당첨자만 새로 뽑고 연출을 초기화(remount)해 새 판 진행
  const replay = () => {
    setWinnerIndex(pickWinner(items.length));
    setRound((r) => r + 1);
  };

  return (
    <div className="app">
      {step === 'choose' && <ChooseAnimation onChoose={handleChoose} />}
      {step === 'setup' && kind && (
        <SetupScreen kind={kind} onStart={handleStart} onBack={toHome} />
      )}
      {step === 'animate' && kind && (
        <>
          {kind === 'card' && (
            <CardDraw
              key={round}
              items={items}
              winnerIndex={winnerIndex}
              onHome={toHome}
              onReplay={replay}
            />
          )}
          {kind === 'roulette' && (
            <Roulette key={round} items={items} onHome={toHome} onReplay={replay} />
          )}
          {kind === 'ladder' && (
            <Ladder
              key={round}
              items={items}
              winnerIndex={winnerIndex}
              onHome={toHome}
              onReplay={replay}
            />
          )}
        </>
      )}
    </div>
  );
}
