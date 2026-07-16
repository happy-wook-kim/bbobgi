import { useState } from 'react';
import type { AnimationKind, ChooseOption, Step } from './types';
import { pickWinner } from './engine/pick';
import { randomKind } from './engine/randomKind';
import { ChooseAnimation } from './components/ChooseAnimation';
import { SetupScreen } from './components/SetupScreen';
import { GameStage } from './components/GameStage';
import { ScoreMode } from './components/ScoreMode';
import { WinnerBurst } from './components/WinnerBurst';

type SetupOption = Exclude<ChooseOption, 'score'>; // card | roulette | ladder | random

export default function App() {
  const [step, setStep] = useState<Step>('choose');
  const [option, setOption] = useState<SetupOption | null>(null);
  const [kind, setKind] = useState<AnimationKind | null>(null); // 이번 판 실제 게임(랜덤이면 매판 새로 결정)
  const [items, setItems] = useState<string[]>([]);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [result, setResult] = useState<number | null>(null); // 게임이 알린 걸린 사람
  const [round, setRound] = useState(0); // 한번 더 할 때마다 증가 → 연출 remount

  const handleChoose = (chosen: ChooseOption) => {
    if (chosen === 'score') {
      setStep('score');
      return;
    }
    setOption(chosen);
    setStep('setup');
  };

  // 모든 게임: 입력한 이름이 items.
  const handleStart = (nextItems: string[]) => {
    setItems(nextItems);
    setKind(option === 'random' ? randomKind() : (option as AnimationKind));
    setWinnerIndex(pickWinner(nextItems.length));
    setResult(null);
    setRound(0);
    setStep('animate');
  };

  const toHome = () => {
    setOption(null);
    setKind(null);
    setItems([]);
    setWinnerIndex(-1);
    setResult(null);
    setStep('choose');
  };

  // 한번 더: 참가자는 그대로, 당첨자·게임(랜덤이면)만 새로 뽑고 연출을 remount
  const replay = () => {
    setKind(option === 'random' ? randomKind() : kind);
    setWinnerIndex(pickWinner(items.length));
    setResult(null);
    setRound((r) => r + 1);
  };

  return (
    <div className="app">
      {step === 'choose' && <ChooseAnimation onChoose={handleChoose} />}

      {step === 'setup' && option && (
        <SetupScreen option={option} onStart={handleStart} onBack={toHome} />
      )}

      {step === 'animate' && kind && (
        <>
          <GameStage
            key={round}
            kind={kind}
            items={items}
            winnerIndex={winnerIndex}
            onWin={(i) => setResult(i)}
          />
          {result !== null && (
            <WinnerBurst
              overlay
              label={items[result]}
              sub="오늘은 이분이 쏘기로 했어요"
              onHome={toHome}
              onReplay={replay}
            />
          )}
        </>
      )}

      {step === 'score' && <ScoreMode onHome={toHome} />}
    </div>
  );
}
