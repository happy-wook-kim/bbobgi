# 경마(🏇) 게임 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 꼴찌 말의 주인이 걸리는 4번째 연출 '경마'를 추가한다 (단독·랜덤·점수 모드 전부).

**Architecture:** 걸린 사람은 기존 `pickWinner`가 사전 확정(`winnerIndex`)하고, 레이스는 연출만 담당한다. 순수 함수 엔진(`race.ts`)이 말별 도착 시각(꼴찌=최대)과 단조 증가 제어점을 생성하고, 컴포넌트는 단일 rAF 루프로 재생 후 `onWin(winnerIndex)`를 호출한다.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest(테스트), pnpm

**Spec:** `docs/superpowers/specs/2026-07-13-horse-race-design.md`

## Global Constraints

- 패키지 매니저는 pnpm. 테스트 `pnpm test`, 빌드 `pnpm build`(tsc --noEmit 포함)
- 커밋 메시지에 Co-Authored-By 라인 금지
- **커밋 단계는 주인님이 커밋을 승인한 경우에만 실행한다** (승인 전이면 커밋 단계를 건너뛰고 다음으로 진행)
- 애니메이션 컴포넌트는 단위테스트 대상에서 제외 (기존 방침)
- 기존 컨벤션 준수: `winnerIndex` = 걸린 사람, 결과 통지는 900ms 지연 후 `onWin`, rAF는 `rafRef`/`wonRef` cleanup 패턴
- 기존 코드의 주석 밀도·네이밍(한국어 주석) 스타일을 따른다

---

### Task 1: 레이스 엔진 `race.ts`

**Files:**
- Create: `src/engine/race.ts`
- Test: `src/engine/race.test.ts`

**Interfaces:**
- Consumes: `shuffle(arr, rand)` (`src/engine/shuffle.ts`)
- Produces (Task 2가 사용):
  - `type Waypoint = { t: number; x: number }`
  - `type RaceProfile = { finishTime: number; waypoints: Waypoint[] }`
  - `buildRaceProfiles(n: number, loserIndex: number, rand?: () => number): RaceProfile[]`
  - `progressAt(profile: RaceProfile, t: number): number` — t는 ms, 반환 0~1

- [ ] **Step 1: 실패하는 테스트 작성**

`src/engine/race.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRaceProfiles, progressAt } from './race';

/** 결정적 테스트용 LCG */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('buildRaceProfiles', () => {
  it('loserIndex 말이 항상 마지막에 도착한다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [2, 3, 5, 12]) {
        const loser = seed % n;
        const profiles = buildRaceProfiles(n, loser, lcg(seed));
        expect(profiles).toHaveLength(n);
        const loserTime = profiles[loser].finishTime;
        profiles.forEach((p, i) => {
          if (i !== loser) expect(p.finishTime).toBeLessThan(loserTime);
        });
      }
    }
  });

  it('꼴찌는 나머지 중 최후 도착보다 300~800ms 늦는다(접전 마진)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const n = 4;
      const loser = seed % n;
      const profiles = buildRaceProfiles(n, loser, lcg(seed));
      const otherMax = Math.max(
        ...profiles.filter((_, i) => i !== loser).map((p) => p.finishTime),
      );
      const margin = profiles[loser].finishTime - otherMax;
      expect(margin).toBeGreaterThanOrEqual(300);
      expect(margin).toBeLessThanOrEqual(800);
    }
  });

  it('제어점의 t·x가 단조 증가하고 끝점은 (finishTime, 1)이다', () => {
    const profiles = buildRaceProfiles(6, 2, lcg(7));
    for (const p of profiles) {
      const pts = p.waypoints;
      expect(pts[0]).toEqual({ t: 0, x: 0 });
      expect(pts[pts.length - 1]).toEqual({ t: p.finishTime, x: 1 });
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].t).toBeGreaterThan(pts[i - 1].t);
        expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
      }
    }
  });
});

describe('progressAt', () => {
  it('t=0에서 0, finishTime 이후에는 1이다', () => {
    const [p] = buildRaceProfiles(3, 1, lcg(3));
    expect(progressAt(p, 0)).toBe(0);
    expect(progressAt(p, p.finishTime)).toBe(1);
    expect(progressAt(p, p.finishTime + 999)).toBe(1);
  });

  it('시간에 대해 단조 증가한다', () => {
    const profiles = buildRaceProfiles(5, 0, lcg(11));
    for (const p of profiles) {
      let prev = -1;
      for (let t = 0; t <= p.finishTime; t += 50) {
        const x = progressAt(p, t);
        expect(x).toBeGreaterThanOrEqual(prev);
        prev = x;
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/engine/race.test.ts`
Expected: FAIL — `Cannot find module './race'` 류의 에러

- [ ] **Step 3: 최소 구현 작성**

`src/engine/race.ts`:

```ts
import { shuffle } from './shuffle';

export type Waypoint = { t: number; x: number };
export type RaceProfile = { finishTime: number; waypoints: Waypoint[] };

const FASTEST = 4500; // 1등 도착 목표(ms)
const SPREAD = 1100; // 1등 ~ 꼴찌 직전까지 도착 시각이 퍼지는 폭
const MARGIN_MIN = 300; // 꼴찌 접전 마진(ms)
const MARGIN_MAX = 800;

/**
 * 말별 도착 시각과 중간 제어점을 생성한다. loserIndex 말이 항상 마지막에 도착한다.
 * 결과(꼴찌)는 호출 전에 확정되어 있으므로 이 함수의 랜덤은 연출(도착 순서·역전)에만 쓰인다.
 */
export function buildRaceProfiles(
  n: number,
  loserIndex: number,
  rand: () => number = Math.random,
): RaceProfile[] {
  const others = n - 1;
  const times: number[] = [];
  for (let k = 0; k < others; k++) {
    const base = others === 1 ? 0 : (k * SPREAD) / (others - 1);
    times.push(FASTEST + base + rand() * 200);
  }
  const assigned = shuffle(times, rand); // 꼴찌 제외 도착 순서를 무작위 배정
  const loserTime = Math.max(...times) + MARGIN_MIN + rand() * (MARGIN_MAX - MARGIN_MIN);

  // 중간 제어점: 구간별 속도가 달라져 역전이 보인다. x는 단조 증가.
  const waypointsFor = (finishTime: number): Waypoint[] => {
    const pts: Waypoint[] = [{ t: 0, x: 0 }];
    const K = 3;
    for (let k = 1; k <= K; k++) {
      const base = k / (K + 1);
      const prev = pts[pts.length - 1].x;
      const x = Math.min(0.98, Math.max(prev + 0.02, base + (rand() - 0.5) * 0.22));
      pts.push({ t: (k / (K + 1)) * finishTime, x });
    }
    pts.push({ t: finishTime, x: 1 });
    return pts;
  };

  let cursor = 0;
  return Array.from({ length: n }, (_, i) => {
    const finishTime = i === loserIndex ? loserTime : assigned[cursor++];
    return { finishTime, waypoints: waypointsFor(finishTime) };
  });
}

/** 시각 t(ms)의 진행도(0~1). 제어점 사이 선형 보간, 단조 증가. */
export function progressAt(profile: RaceProfile, t: number): number {
  const pts = profile.waypoints;
  if (t <= 0) return 0;
  if (t >= profile.finishTime) return 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return a.x + (b.x - a.x) * u;
    }
  }
  return 1;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/engine/race.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 테스트·타입 확인**

Run: `pnpm test && pnpm build`
Expected: 전체 PASS, 빌드 성공

- [ ] **Step 6: 커밋** *(주인님 커밋 승인 시에만)*

```bash
git add src/engine/race.ts src/engine/race.test.ts
git commit -m "feat: add race engine (predetermined loser, monotone progress curves)"
```

---

### Task 2: `HorseRace` 컴포넌트 + 스타일

**Files:**
- Create: `src/components/animations/HorseRace.tsx`
- Modify: `src/styles.css` (파일 끝에 경마 섹션 추가)

**Interfaces:**
- Consumes: `buildRaceProfiles`, `progressAt`, `RaceProfile` (Task 1)
- Produces (Task 3이 사용): `HorseRace({ items, winnerIndex, onWin }: { items: string[]; winnerIndex: number; onWin: (index: number) => void })` — 카드·사다리와 동일 시그니처

- [ ] **Step 1: 컴포넌트 작성**

`src/components/animations/HorseRace.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRaceProfiles, progressAt } from '../../engine/race';

type Props = {
  items: string[];
  winnerIndex: number;
  onWin: (index: number) => void;
};

const HORSE_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1',
  '#c2185b', '#fbc02d', '#5e35b1', '#00897b', '#d81b60', '#3949ab',
];

export function HorseRace({ items, winnerIndex, onWin }: Props) {
  const n = items.length;
  // winnerIndex(걸린 사람) 말이 꼴찌가 되도록 궤적을 생성한다.
  const profiles = useMemo(() => buildRaceProfiles(n, winnerIndex), [n, winnerIndex]);
  // 도착 시각 오름차순 → 순위(0=1등). 꼴찌는 항상 마지막.
  const rankOf = useMemo(() => {
    const order = profiles
      .map((_, i) => i)
      .sort((a, b) => profiles[a].finishTime - profiles[b].finishTime);
    const r = new Array<number>(n);
    order.forEach((horse, rank) => {
      r[horse] = rank;
    });
    return r;
  }, [profiles, n]);

  const [t, setT] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef(0);
  const wonRef = useRef(0);
  const endTime = profiles[winnerIndex].finishTime; // 꼴찌 도착 = 레이스 종료

  const start = () => {
    if (started) return;
    setStarted(true);
    const t0 = performance.now();
    const step = (now: number) => {
      const tt = now - t0;
      if (tt >= endTime) {
        setT(endTime);
        setDone(true);
        // 꼴찌를 눈으로 확인할 여유를 두고 결과를 알린다.
        wonRef.current = window.setTimeout(() => onWin(winnerIndex), 900);
      } else {
        setT(tt);
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(wonRef.current);
    },
    [],
  );

  return (
    <div className="screen race">
      <p className="eyebrow">경마</p>
      <h2 className="stage-title">
        {done ? items[winnerIndex] : started ? '달리는 중…' : '출발을 누르세요'}
      </h2>
      <div className="race-track">
        {items.map((name, i) => {
          const progress = progressAt(profiles[i], t);
          const finished = started && t >= profiles[i].finishTime;
          const isLoser = i === winnerIndex;
          return (
            <div key={i} className={`race-lane ${done && isLoser ? 'is-loser' : ''}`}>
              <span
                className="race-name"
                style={{ color: HORSE_COLORS[i % HORSE_COLORS.length] }}
              >
                {name}
              </span>
              <div className="race-run">
                <span
                  className={`race-horse ${started && !finished ? 'is-running' : ''}`}
                  style={{ left: `calc(${(progress * 100).toFixed(2)}% - ${(progress * 34).toFixed(1)}px)` }}
                  aria-hidden
                >
                  🐎
                </span>
              </div>
              <b className={`race-rank ${done && isLoser ? 'is-loser' : ''}`}>
                {finished ? (done && isLoser ? '꼴찌' : `${rankOf[i] + 1}등`) : ''}
              </b>
            </div>
          );
        })}
      </div>
      <button
        className="btn-primary"
        onClick={start}
        disabled={started}
        style={{ visibility: started ? 'hidden' : 'visible' }}
      >
        출발
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 스타일 추가**

`src/styles.css` 파일 끝에 추가:

```css
/* ── 경마 ── */
.race-track { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.race-lane {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: 12px;
}
.race-lane.is-loser { background: #fdecea; }
.race-name {
  width: 72px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.race-run {
  position: relative;
  flex: 1;
  height: 34px;
  border-bottom: 2px dashed var(--line);
  border-right: 3px solid var(--ink); /* 결승선 */
}
.race-horse {
  position: absolute;
  top: 0;
  font-size: 26px;
  line-height: 34px;
  transform: scaleX(-1); /* 🐎가 왼쪽을 보므로 진행 방향(오른쪽)으로 뒤집기 */
}
.race-horse.is-running { animation: gallop 0.35s ease-in-out infinite alternate; }
@keyframes gallop {
  from { transform: scaleX(-1) translateY(0); }
  to { transform: scaleX(-1) translateY(-4px); }
}
.race-rank {
  width: 38px;
  font-size: 13px;
  color: var(--muted);
  text-align: left;
}
.race-rank.is-loser { color: #e53935; font-size: 15px; }
```

- [ ] **Step 3: 타입·빌드 확인**

Run: `pnpm build`
Expected: 성공 (아직 어디서도 import하지 않지만 tsc가 파일 자체를 검사)

- [ ] **Step 4: 커밋** *(주인님 커밋 승인 시에만)*

```bash
git add src/components/animations/HorseRace.tsx src/styles.css
git commit -m "feat: add HorseRace animation component (loser-last race, rank badges)"
```

---

### Task 3: 모드 통합 (타입·풀·메뉴·스테이지)

**Files:**
- Modify: `src/types.ts:1`
- Modify: `src/engine/randomKind.ts:3`
- Modify: `src/components/GameStage.tsx`
- Modify: `src/components/ChooseAnimation.tsx:8-14`
- Modify: `src/components/SetupScreen.tsx:13-18`

**Interfaces:**
- Consumes: `HorseRace` (Task 2)
- Produces: `AnimationKind`에 `'horse'` 포함 — 앱 전체(랜덤·점수 모드 포함)에서 경마 사용 가능

- [ ] **Step 1: 타입 확장**

`src/types.ts` 1행:

```ts
export type AnimationKind = 'card' | 'roulette' | 'ladder' | 'horse';
```

- [ ] **Step 2: 랜덤 풀 확장**

`src/engine/randomKind.ts`의 KINDS와 주석:

```ts
const KINDS: AnimationKind[] = ['card', 'roulette', 'ladder', 'horse'];

/** 네 게임 중 하나를 균등 확률로 고른다. */
```

- [ ] **Step 3: GameStage 분기 추가**

`src/components/GameStage.tsx`에 import와 분기 추가:

```tsx
import { HorseRace } from './animations/HorseRace';
```

`if (kind === 'roulette')` 행 다음에:

```tsx
  if (kind === 'horse') return <HorseRace items={items} winnerIndex={winnerIndex} onWin={onWin} />;
```

- [ ] **Step 4: 메인 메뉴·설정 라벨 추가**

`src/components/ChooseAnimation.tsx` OPTIONS의 ladder 항목 다음에:

```ts
  { option: 'horse', icon: '🏇', title: '경마', desc: '꼴찌로 들어온 말이' },
```

`src/components/SetupScreen.tsx` OPTION_LABEL의 ladder 항목 다음에:

```ts
  horse: '경마',
```

- [ ] **Step 5: 전체 테스트·빌드 확인**

Run: `pnpm test && pnpm build`
Expected: 전체 PASS, 빌드 성공 (OPTION_LABEL은 `Record<SetupOption, string>` 타입이라 누락 시 여기서 컴파일 에러로 잡힌다)

- [ ] **Step 6: 수동 검증 (dev 서버)**

Run: `pnpm dev`

확인 항목:
1. 메인 화면에 🏇 경마 카드가 보인다
2. 경마 → 이름 2명 입력 → 시작 → `출발` → 말들이 달리고 역전이 보인다
3. 전원 도착 후 순위 뱃지, 꼴찌 강조 → 900ms 뒤 WinnerBurst에 꼴찌 이름
4. `한번 더` → 새 레이스 정상 동작 (remount)
5. 랜덤 모드에서 여러 번 돌려 경마가 섞여 나온다
6. 점수 대결 → 경마 판에서 걸린 사람 점수가 +1 된다

- [ ] **Step 7: 커밋** *(주인님 커밋 승인 시에만)*

```bash
git add src/types.ts src/engine/randomKind.ts src/components/GameStage.tsx src/components/ChooseAnimation.tsx src/components/SetupScreen.tsx
git commit -m "feat: wire horse race into all modes (menu, random pool, score mode)"
```
