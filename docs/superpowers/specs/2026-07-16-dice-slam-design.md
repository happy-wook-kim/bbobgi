# 주사위 슬램(🎲) 설계 문서

작성일: 2026-07-16

## 1. 개요

바닥이 참가자 구역으로 나뉜 탑다운 보드에서 주사위를 굴린다. **스페이스 키/화면 탭**으로 ✋ 손바닥이 바닥을 내려치면 그 반동으로 주사위가 다시 떠올라 굴러가고, 입력이 없으면 마찰로 감속해 멈춘다. **멈춘 구역의 주인이 걸린 사람**. 두 가지 결정 방식을 게임 안 토글로 제공해 비교 후 하나를 채택한다(채택 전까지 랜덤·점수 풀 미편입).

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 당첨 규칙 | 주사위가 멈춘 구역의 주인이 걸림 (주사위 눈금 무관) |
| 모드 | **물리 모드로 확정** (2026-07-16 비교 후 결정) — 확정 모드·토글 제거. 마찰 λ 1.4→1.0으로 낮춰 더 오래 굴러감 |
| 자동 슬램 | 수동 입력 없음 — 게임 시작 시 10~20회 랜덤 결정, 시간 예약 방식으로 자동 ✋. 간격은 0.14초에서 시작해 점차 느려지고(빵빵빵→여유), **마지막 5회는 0.9초 고정 카운트다운** — 남은 숫자가 점점 커지는 5-4-3-2-1 연출(빨간 거대 숫자) |
| 공정성 | 자동 슬램 게임 600판 시뮬레이션으로 구역 확률 15~35%(균등 25% 기준) 범위 검증을 테스트로 보장 |
| 구역 배치 | 행별 셀 수 ±1, 행 높이를 셀 수에 비례시켜 **모든 구역 면적 = 1/n** 보장 |
| 입력 | 던지기 버튼 하나 — 이후는 전부 자동 진행 |
| 통합 | `AnimationKind`에 `'dice'` 추가, 메뉴 등록. **랜덤·점수 풀 제외**(모드 확정 후 편입). 랜덤 아이콘 🎲→🔀 변경 |
| 연출 | CSS 3D 큐브(이동 방향으로 구름), 그림자, ✋ 쿵+충격파 링, 멈춘 구역 하이라이트 → 900ms 후 발표 |

## 3. 엔진 — `src/engine/dice.ts` (순수 함수, rand 주입, 좌표계 0~1 정사각 보드)

```ts
type Vec = { x: number; y: number };
type ZoneRect = { x: number; y: number; w: number; h: number };
zoneRects(n): ZoneRect[]           // 면적 1/n 균등 격자
zoneOf(pos, n): number             // 좌표 → 구역 인덱스

// 🎯 확정 모드 — 시간 매개 경로 스크립트 (경마 waypoints와 같은 발상)
type DicePath = { pts: { t: number; x: number; y: number }[] };
planPath(from, targetZone, n, rand): DicePath  // 킥(빠른 직진) → 감속 → 목표 구역 안 정지
pathPosAt(path, t): Vec                        // 구간 보간(마지막 구간 ease-out)

// 🌪 물리 모드
type DiceBody = { pos: Vec; vel: Vec };
stepBody(body, dt): DiceBody       // 지수 마찰(λ≈1.4/s) + 벽 반사(감쇠 0.8)
slamImpulse(body, rand): DiceBody  // 보드 안쪽으로 튕기는 충격
isStopped(body): boolean           // |v| < 0.03
```

- 확정 모드 보장: `planPath`의 끝점은 항상 목표 구역 내부(가장자리 여유 포함). 슬램 = 현재 위치에서 재계획(목표 동일) → **몇 번을 치든 최종 구역 불변**
- 물리 모드: 결과는 순수하게 역학으로 결정(타이밍 개입 허용이 이 모드의 정체성)

## 4. 컴포넌트 — `src/components/animations/DiceSlam.tsx`

- Props `{ items, winnerIndex, onWin }` (기존 시그니처). 확정 모드는 `onWin(winnerIndex)`, 물리 모드는 `onWin(zoneOf(멈춘 위치))`
- 보드: `min(88vw, 420px)` 정사각, 구역 = 색 라벨 칸. 주사위: CSS 3D 큐브(pip 면), 이동 거리에 비례해 회전, 슬램 시 ✋ 스탬프 + 충격파 + 홉
- 단일 rAF 루프(확정=경로 평가, 물리=적분), `rafRef`/`wonRef` cleanup, Space keydown + 보드 pointerdown 리스너
- 모드 토글은 던지기 전에만 조작 가능

## 5. 기존 코드 변경

| 파일 | 변경 |
|---|---|
| `src/types.ts` | `AnimationKind`에 `'dice'` 추가 |
| `src/components/GameStage.tsx` | dice 분기 추가 |
| `src/components/ChooseAnimation.tsx` | 🎲 주사위 항목 추가, 랜덤 아이콘 🔀로 변경 |
| `src/components/SetupScreen.tsx` | OPTION_LABEL에 dice |
| `src/styles.css` | 보드·구역·큐브·슬램 스타일 |

`randomKind.ts`는 변경하지 않는다(풀 4종 유지).

## 6. 테스트 — `src/engine/dice.test.ts`

- zoneRects: n=2~12 면적 각 1/n(오차 1e-9), 보드 내부, zoneOf(중심)=인덱스
- planPath: 끝점이 항상 목표 구역 안 / 슬램 재계획 체인 후에도 목표 구역 / pathPosAt(0)=시작점
- stepBody: 속도 단조 감소(벽 반사 제외), 10초 내 정지, 위치가 보드 밖으로 안 나감
- slamImpulse: 속도 증가, 위치 불변

## 7. 범위 밖 (YAGNI)

- 랜덤·점수 풀 편입(모드 확정 후), 주사위 눈금 규칙, 멀티 주사위, 사운드
