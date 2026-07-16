# 카드 뽑기 개편(슬롯머신 포커스) 설계 문서

작성일: 2026-07-16 · 대체: 수동 뒤집기 방식(2026-07-07 설계의 카드 연출)

## 1. 개요

손으로 뒤집는 방식을 없애고 **전자동 슬롯 연출**로 바꾼다. 참가자 이름을 받고, 차례대로
굵은 테두리 포커스가 카드들 위를 가로로 띡띡띡 순회하다 점차 느려져 한 장에 멈추면
그 카드가 즉시 뒤집힌다. ❌면 다음 사람 자동 진행, 🎯이면 그 차례 사람이 걸림.

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 입력 | 이름 입력(NameSetup, 2명+) — 인원수 스테퍼·익명 토큰(이모지) 제거 |
| 진행 | `시작` 한 번 → 참가자 순서대로 전자동. 뒤집힌 카드는 순회에서 제외 |
| 공정성 | `pickWinner`(참가자) 사전 확정 유지 — 참가자↔카드 배정을 셔플로 미리 정하고(🎯=걸린 사람 몫), 포커스는 배정 카드에 정확히 멈추는 연출 |
| 슬롯 감속 | 틱 간격 70ms→450ms 거듭제곱 램프, 2~3바퀴 순회 후 목표 카드에 정지 |
| 공개 | 멈춘 카드 즉시 뒤집기(❌/🎯), 카드에 뽑은 사람 이름표. 🎯이면 종료 → 900ms 후 발표(이름) |
| 결과 라벨 | App의 카드 전용 '🎯' 라벨 분기 제거 — 다른 게임처럼 걸린 사람 이름 표시 |

## 3. 엔진 — `src/engine/cardSlot.ts` (순수 함수, rand 주입)

```ts
assignCards(n, rand): number[]        // cardOf[참가자] = 카드 인덱스 (균등 전단사)
spinPlan(available, target, rand): { path: number[]; delays: number[] }
// path: available 순서로 2~3바퀴 순회 후 마지막이 target. delays: 70→450ms 단조 증가
```

## 4. 컴포넌트 — `CardDraw.tsx` 재작성

- Props `{ items(이름), winnerIndex, onWin }` 유지. 🎯 카드 = `cardOf[winnerIndex]`
- 차례 t: 제목 "이름 차례" → spinPlan을 setTimeout 체인으로 재생(포커스 이동) → 정지 후 뒤집기 →
  t === winnerIndex면 종료(onWin(winnerIndex)), 아니면 다음 차례 자동
- 기존 flip-card CSS·CardConfetti 재사용, `.is-focus`(굵은 테두리)·이름표 추가

## 5. 기존 코드 변경

| 파일 | 변경 |
|---|---|
| `SetupScreen.tsx` | card도 NameSetup 사용 — CardSetup·assignTokens 제거 |
| `engine/tokens.ts`(+test) | 삭제 (이 개편으로 사용처 소멸) |
| `App.tsx` | isCard 라벨 분기 제거 |
| `games.ts` | 카드 desc: '띡띡띡 돌다 멈춘 카드 공개' |
| `App.test.tsx` / `SetupScreen.test.tsx` | 새 흐름(이름 입력·자동 진행)에 맞게 갱신 |

## 6. 테스트

- assignCards: n=2~12 전단사 / spinPlan: 경로가 available만 방문·마지막=target·2바퀴 이상·delays 단조 증가
- App 통합: 이름 2명 → 시작 → 자동 진행 끝에 당첨 오버레이(이름)

## 7. 범위 밖

- 카드 수 ≠ 인원수 옵션, 수동 모드 병행, 사운드
