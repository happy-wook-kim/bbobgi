import { useState } from 'react';
import type { Mode, Participant, Outcome, DrawResult, AnimationKind, Step } from './types';
import { assignTokens } from './engine/tokens';
import { draw } from './engine/draw';
import { SetupScreen } from './components/SetupScreen';
import { TokenReveal } from './components/TokenReveal';
import { ChooseAnimation } from './components/ChooseAnimation';
import { ResultScreen } from './components/ResultScreen';

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mode, setMode] = useState<Mode>('single');
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [kind, setKind] = useState<AnimationKind | null>(null);
  const [result, setResult] = useState<DrawResult | null>(null);

  const handleStart = (names: string[], m: Mode, outcomeLabels: string[]) => {
    const tokens = assignTokens(names.length);
    setParticipants(names.map((name, i) => ({ id: `p-${i}`, name, token: tokens[i] })));
    setMode(m);
    setOutcomes(outcomeLabels.map((label, i) => ({ id: `o-${i}`, label })));
    setStep('reveal');
  };

  const handleChoose = (chosen: AnimationKind) => {
    setKind(chosen);
    setResult(draw(mode, participants, outcomes));
    setStep('animate');
  };

  const restart = () => {
    setParticipants([]);
    setOutcomes([]);
    setKind(null);
    setResult(null);
    setStep('setup');
  };

  return (
    <div className="app">
      {step === 'setup' && <SetupScreen onStart={handleStart} />}
      {step === 'reveal' && (
        <TokenReveal participants={participants} onDone={() => setStep('choose')} />
      )}
      {step === 'choose' && <ChooseAnimation onChoose={handleChoose} />}
      {step === 'animate' && result && (
        <div className="screen">
          <p>연출: {kind} (임시 — 다음 태스크에서 교체)</p>
          <button className="primary" onClick={() => setStep('result')}>
            결과 보기
          </button>
        </div>
      )}
      {step === 'result' && result && (
        <ResultScreen
          participants={participants}
          outcomes={outcomes}
          result={result}
          onRestart={restart}
        />
      )}
    </div>
  );
}
