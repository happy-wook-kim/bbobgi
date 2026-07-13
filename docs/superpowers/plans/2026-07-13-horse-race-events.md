# 경마 v2 (긴 트랙 + 이벤트) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카메라 추적 스크롤 트랙(월드 1100px, ~9초)과 🪨/⚡ 이벤트를 추가한다. 꼴찌 사전 확정은 불변.

**Architecture:** `race.ts`의 waypoints 생성을 구간 기반(이벤트 배치 → 사이 채움 → 정규화)으로 재구성하고 `events`를 노출. `HorseRace.tsx`는 렌더 시 카메라 오프셋과 이벤트 활성 상태를 계산해 클래스·마커로 표현.

**Tech Stack:** 기존과 동일 (React 19 + TS + Vite, Vitest, pnpm)

**Spec:** `docs/superpowers/specs/2026-07-13-horse-race-events-design.md`

## Global Constraints

- 기존 race.test.ts 5개 테스트는 **수정 없이** 통과해야 한다
- 커밋은 주인님이 직접 (이 계획에 커밋 단계 없음)
- 상수: FASTEST 7000 / SPREAD 1600 / 마진 300~800 / 월드 1100px / 카메라 앵커 55% / 돌 0.02 가중치 / 부스터 2.5배속

---

### Task 1: 엔진 v2 — 이벤트 시스템 (TDD)

**Files:**
- Modify: `src/engine/race.ts` (waypoints 생성 재구성 + events)
- Modify: `src/engine/race.test.ts` (describe 'events' 추가만)

**Interfaces (Produces):**
- `type RaceEventKind = 'rock' | 'boost'`
- `type RaceEvent = { kind: RaceEventKind; t: number; duration: number; x: number }`
- `RaceProfile`에 `events: RaceEvent[]` 추가. `buildRaceProfiles`/`progressAt` 시그니처 불변

- [ ] **Step 1:** race.test.ts에 events describe 추가 (개수·종류·x범위 / 시간대·비겹침 / 돌·부스터 구간 속도 행동 검증) → 실패 확인
- [ ] **Step 2:** race.ts 구현 — 스펙 §3의 4단계 구간 기반 생성. 상수는 Global Constraints 값
- [ ] **Step 3:** `pnpm vitest run src/engine/race.test.ts` 신규+기존 전부 PASS 확인

### Task 2: 컴포넌트 v2 — 카메라 + 이벤트 연출

**Files:**
- Modify: `src/components/animations/HorseRace.tsx`
- Modify: `src/styles.css` (경마 섹션 교체 + `.screen.race` full-bleed)

**Interfaces (Consumes):** Task 1의 `events`, 기존 `progressAt`

- [ ] **Step 1:** 뷰포트/월드 구조·카메라 계산·이름표·마커·이펙트 구현 (스펙 §4)
- [ ] **Step 2:** CSS 교체 — `.race-viewport/.race-world/.race-finish/.race-glyph/.race-tag/.race-fx/.race-item`, gallop을 glyph로 이동, stumble 키프레임 추가
- [ ] **Step 3:** `pnpm test && pnpm build` PASS

### Task 3: 검증

- [ ] **Step 1:** dev 서버 + Playwright(channel chrome)로 구동 — 카메라 translateX 변화, 🪨/⚡ 마커 표출, 💫/🔥 발동, 꼴찌 결과 정상, 페이지 에러 0
- [ ] **Step 2:** 프로브 — n=2·8명, 이벤트 0개인 말 존재 시 정상, 한번 더 remount
