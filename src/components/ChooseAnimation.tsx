import { useEffect, useState } from 'react';
import type { ChooseOption } from '../types';

type Props = {
  onChoose: (option: ChooseOption) => void;
};

const OPTIONS: { option: ChooseOption; icon: string; title: string; desc: string }[] = [
  { option: 'card', icon: '🃏', title: '카드 뽑기', desc: '한 장씩 뒤집어 당첨 확인' },
  { option: 'roulette', icon: '🎡', title: '룰렛', desc: '돌려서 멈추는 사람' },
  { option: 'ladder', icon: '🪜', title: '사다리타기', desc: '줄 따라 내려가서' },
  { option: 'random', icon: '🎲', title: '랜덤', desc: '셋 중 하나 랜덤으로' },
  { option: 'score', icon: '🏆', title: '점수 대결', desc: '목표 점수 먼저 도달' },
];

const WORDS = ['커피값', '점심값', '치킨값', '저녁값', '술값'];

/** 한 글자씩 치고 → 잠깐 멈췄다 → 한 글자씩 지우고 → 다음 단어로 순환. */
function useTypewriter(words: string[]) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    let timeout: number;
    if (!deleting) {
      if (text.length < word.length) {
        timeout = window.setTimeout(() => setText(word.slice(0, text.length + 1)), 130);
      } else {
        timeout = window.setTimeout(() => setDeleting(true), 1400);
      }
    } else if (text.length > 0) {
      timeout = window.setTimeout(() => setText(word.slice(0, text.length - 1)), 70);
    } else {
      timeout = window.setTimeout(() => {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      }, 300);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, wordIdx, words]);

  return text;
}

export function ChooseAnimation({ onChoose }: Props) {
  const word = useTypewriter(WORDS);

  return (
    <div className="screen choose">
      <header className="hero">
        <h1 className="hero-title">뽑기</h1>
        <p className="hero-sub">
          오늘 <span className="type-word">{word}</span>
          <span className="type-cursor" aria-hidden>|</span>, 누가 쏠까?
        </p>
      </header>
      <div className="choose-list">
        {OPTIONS.map((opt) => (
          <button key={opt.option} className="choose-card" onClick={() => onChoose(opt.option)}>
            <span className="choose-icon" aria-hidden>{opt.icon}</span>
            <span className="choose-text">
              <b>{opt.title}</b>
              <small>{opt.desc}</small>
            </span>
            <span className="choose-arrow" aria-hidden>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
