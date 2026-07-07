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

  const handleChoose = (chosen: AnimationKind) => {
    setKind(chosen);
    setStep('setup');
  };

  // 카드: assignTokens로 만든 토큰 items. 룰렛·사다리: 입력한 이름 items.
  const handleStart = (nextItems: string[]) => {
    setItems(nextItems);
    setWinnerIndex(pickWinner(nextItems.length));
    setStep('animate');
  };

  const toChoose = () => {
    setKind(null);
    setItems([]);
    setWinnerIndex(-1);
    setStep('choose');
  };

  // 세 연출 모두 멈추면 잠깐 뒤 당첨 연출을 자체적으로 띄우고, 끝나면 처음으로 돌아온다.
  return (
    <div className="app">
      {step === 'choose' && <ChooseAnimation onChoose={handleChoose} />}
      {step === 'setup' && kind && (
        <SetupScreen kind={kind} onStart={handleStart} onBack={toChoose} />
      )}
      {step === 'animate' && kind && (
        <>
          {kind === 'card' && (
            <CardDraw items={items} winnerIndex={winnerIndex} onComplete={toChoose} />
          )}
          {kind === 'roulette' && <Roulette items={items} onComplete={toChoose} />}
          {kind === 'ladder' && (
            <Ladder items={items} winnerIndex={winnerIndex} onComplete={toChoose} />
          )}
        </>
      )}
    </div>
  );
}
