import { useState } from 'react';
import type { Mode, Participant, Outcome, Step } from './types';
import { assignTokens } from './engine/tokens';
import { SetupScreen } from './components/SetupScreen';

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [, setMode] = useState<Mode>('single');
  const [, setOutcomes] = useState<Outcome[]>([]);

  const handleStart = (names: string[], mode: Mode, outcomeLabels: string[]) => {
    const tokens = assignTokens(names.length);
    const parts: Participant[] = names.map((name, i) => ({
      id: `p-${i}`,
      name,
      token: tokens[i],
    }));
    const outs: Outcome[] = outcomeLabels.map((label, i) => ({ id: `o-${i}`, label }));
    setParticipants(parts);
    setMode(mode);
    setOutcomes(outs);
    setStep('reveal');
  };

  return (
    <div className="app">
      {step === 'setup' && <SetupScreen onStart={handleStart} />}
      {step !== 'setup' && (
        <div className="screen">
          <p>단계: {step}</p>
          <p>참가자 {participants.length}명 배정 완료</p>
        </div>
      )}
    </div>
  );
}
