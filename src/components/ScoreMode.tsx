import { useRef, useState } from 'react';
import type { AnimationKind } from '../types';
import { pickWinner } from '../engine/pick';
import { shuffleKinds } from '../engine/randomKind';
import { GameStage } from './GameStage';
import { WinnerBurst } from './WinnerBurst';

type Props = { onHome: () => void };
type Phase = 'setup' | 'play' | 'board' | 'done';

const MAX_TARGET = 10;

export function ScoreMode({ onHome }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [names, setNames] = useState<string[]>(['', '']);
  const [target, setTarget] = useState(3);
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [kind, setKind] = useState<AnimationKind>('card');
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [roundNo, setRoundNo] = useState(0);
  const [lastLoser, setLastLoser] = useState(-1);

  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  const canStart = trimmed.length >= 2;

  // 셔플 백: 네 게임을 한 바퀴 다 돌기 전엔 같은 게임이 반복되지 않는다.
  const bagRef = useRef<AnimationKind[]>([]);
  const lastKindRef = useRef<AnimationKind | null>(null);

  const rollNextGame = (roster: string[]) => {
    if (bagRef.current.length === 0) bagRef.current = shuffleKinds(lastKindRef.current);
    const next = bagRef.current.shift()!;
    lastKindRef.current = next;
    setKind(next);
    setWinnerIndex(pickWinner(roster.length));
    setRoundNo((r) => r + 1);
    setPhase('play');
  };

  const start = () => {
    if (!canStart) return;
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setLastLoser(-1);
    rollNextGame(trimmed);
  };

  // 이번 판에서 걸린 사람 +1. 목표 점수에 먼저 닿으면 그 사람이 쏘는 사람.
  const handleRoundWin = (index: number) => {
    const next = scores.map((s, i) => (i === index ? s + 1 : s));
    setScores(next);
    setLastLoser(index);
    setPhase(next[index] >= target ? 'done' : 'board');
  };

  const restart = () => {
    setScores(players.map(() => 0));
    setLastLoser(-1);
    rollNextGame(players);
  };

  if (phase === 'setup') {
    return (
      <div className="screen setup">
        <button className="btn-ghost back" onClick={onHome}>
          ← 게임 바꾸기
        </button>
        <p className="eyebrow">점수 대결</p>
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

        <p className="hint">목표 점수에 먼저 도달한 사람이 쏘기로 해요.</p>
        <div className="stepper">
          <button
            className="step-btn"
            onClick={() => setTarget((t) => Math.max(1, t - 1))}
            disabled={target <= 1}
            aria-label="목표 점수 줄이기"
          >
            −
          </button>
          <span className="step-count">{target}</span>
          <button
            className="step-btn"
            onClick={() => setTarget((t) => Math.min(MAX_TARGET, t + 1))}
            disabled={target >= MAX_TARGET}
            aria-label="목표 점수 늘리기"
          >
            +
          </button>
        </div>

        <button className="btn-primary" disabled={!canStart} onClick={start}>
          대결 시작
        </button>
      </div>
    );
  }

  if (phase === 'board') {
    const leader = Math.max(...scores);
    return (
      <div className="screen scoreboard">
        <p className="eyebrow">{roundNo}판 종료</p>
        <h2 className="stage-title">
          <b className="score-hit-name">{players[lastLoser]}</b> 걸렸어요!
        </h2>
        <ul className="score-list">
          {players.map((name, i) => (
            <li
              key={i}
              className={`score-row ${i === lastLoser ? 'is-hit' : ''} ${
                scores[i] === leader ? 'is-leader' : ''
              }`}
            >
              <span className="score-name">{name}</span>
              <span className="score-dots" aria-hidden>
                {Array.from({ length: target }, (_, d) => (
                  <i key={d} className={d < scores[i] ? 'on' : ''} />
                ))}
              </span>
              <span className="score-num">
                {scores[i]}
                <small>/{target}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <button className="btn-secondary" onClick={onHome}>
            그만하기
          </button>
          <button className="btn-primary" onClick={() => rollNextGame(players)}>
            다음 판
          </button>
        </div>
      </div>
    );
  }

  // play · done: 게임을 유지한 채 done이면 결과를 덮어 보여준다.
  return (
    <>
      <GameStage
        key={roundNo}
        kind={kind}
        items={players}
        winnerIndex={winnerIndex}
        onWin={handleRoundWin}
      />
      {phase === 'done' && (
        <WinnerBurst
          overlay
          label={players[lastLoser]}
          sub={`${target}점을 먼저 채웠어요 · 오늘은 이분이 쏩니다`}
          onHome={onHome}
          onReplay={restart}
        />
      )}
    </>
  );
}
