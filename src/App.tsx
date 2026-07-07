import { useState } from 'react';
import type { Mode, Participant, Outcome, DrawResult, AnimationKind, Step } from './types';
import { assignTokens } from './engine/tokens';
import { draw } from './engine/draw';
import { SetupScreen } from './components/SetupScreen';
import { TokenReveal } from './components/TokenReveal';
import { ChooseAnimation } from './components/ChooseAnimation';
import { CardDraw } from './components/animations/CardDraw';
import { Roulette } from './components/animations/Roulette';
import { Ladder } from './components/animations/Ladder';
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
        <>
          {kind === 'card' && (
            <CardDraw
              participants={participants}
              outcomes={outcomes}
              result={result}
              onComplete={() => setStep('result')}
            />
          )}
          {kind === 'roulette' && (
            <Roulette
              participants={participants}
              outcomes={outcomes}
              result={result}
              onComplete={() => setStep('result')}
            />
          )}
          {kind === 'ladder' && (
            <Ladder participants={participants} outcomes={outcomes} result={result} onComplete={() => setStep('result')} />
          )}
        </>
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
