# 경마(🏇) 게임 설계 문서

작성일: 2026-07-13

## 1. 개요

bbobgi의 4번째 연출로 **경마**를 추가한다. 참가자마다 말이 한 마리씩 배정되고, `출발`을 누르면 말들이 자동으로 달린다. **꼴찌로 결승선에 들어온 말의 주인이 걸린 사람(쏘는 사람)**이 된다. 단독 선택·랜덤 모드·점수 대결 모두에서 사용한다.

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 당첨 규칙 | 꼴찌 말의 주인이 걸린다 |
| 꼴찌 결정 | `pickWinner`로 사전 확정, 레이스는 연출 (카드·사다리와 동일 구조) |
| 모드 연동 | 단독 선택 + 랜덤 풀 + 점수 대결 풀 모두 포함 (4종 균등) |
| 구현 방식 | rAF 진행도 공식 — 말별 도착 시각을 미리 정하고 중간 경로를 랜덤 곡선으로 생성 |
| 입력 | 기존 `NameSetup` 재사용 (이름 입력, 2명 이상) |

## 3. 규칙 · 사용자 흐름

```
1. 메인 화면에서 🏇 경마 선택 (또는 랜덤/점수 모드에서 자동 등장)
2. 참가자 이름 입력 → 시작
3. 트랙 화면: 참가자별 레인 + 말(🐎) + 이름 라벨, 오른쪽 끝 결승선
4. 출발 버튼 → 말들이 자동으로 달린다 (역전·접전 연출)
5. 도착한 말부터 순위 뱃지(1등, 2등, …) 표시
6. 마지막 말 도착 → 꼴찌 강조 → 900ms 후 onWin(winnerIndex) → WinnerBurst
```

- 기존 컨벤션에서 `winnerIndex` = 걸린 사람이다. 경마에서는 **`winnerIndex` 말이 꼴찌가 되도록 연출**하고, 종료 시 `onWin(winnerIndex)`를 그대로 호출한다.

## 4. 레이스 엔진 — `src/engine/race.ts` (순수 함수)

연출용 궤적을 생성한다. 결과(꼴찌)는 이미 확정되어 있으므로 엔진은 공정성에 관여하지 않고, **도착 순서 보장**만 책임진다.

```ts
type RaceProfile = { finishTime: number; waypoints: { t: number; x: number }[] };

/** 말별 도착 시각과 중간 제어점을 생성한다. loserIndex 말이 항상 마지막에 도착한다. */
function buildRaceProfiles(n: number, loserIndex: number, rand?: () => number): RaceProfile[];

/** 시각 t의 진행도(0~1). 단조 증가, progressAt(p, p.finishTime) === 1. */
function progressAt(profile: RaceProfile, t: number): number;
```

보장 사항:

- `finishTime`: 기본 레이스 길이 약 6초. 꼴찌 = 최대값이며 마지막에서 두 번째보다 0.3~0.8초 늦게 도착(접전 연출), 나머지 순서는 셔플로 무작위.
- `waypoints`: 진행도 0→1 사이의 제어점. **단조 증가**(뒤로 달리지 않음)하되 구간별 속도가 달라 역전이 보이도록 한다.
- 제어점 사이는 스무스 보간으로 연결하고 `f(finishTime) = 1`을 정확히 만족한다.

## 5. 컴포넌트 — `src/components/animations/HorseRace.tsx`

- Props: `{ items: string[]; winnerIndex: number; onWin: (index: number) => void }` — 카드·사다리와 동일 시그니처.
- 가로 트랙에 참가자 수만큼 레인이 세로로 쌓인다. 인원이 많으면 세로 스크롤(`ladder-scroll` 패턴).
- 단일 rAF 루프에서 전체 말 위치를 갱신한다(`x = progressAt(profile, t) * 트랙폭`). 사다리와 동일한 `rafRef`/`wonRef` cleanup 패턴.
- 도착한 말은 결승선 뒤에 정지하고 순위 뱃지를 단다. 마지막 말 도착 시 꼴찌를 강조하고 900ms 뒤 `onWin(winnerIndex)`.
- 레인 색상 상수는 컴포넌트 내부에 둔다(기존 `Ladder.tsx`의 `PLAYER_COLORS` 스타일을 따름).
- 달리는 동안 말은 가벼운 bobbing(CSS transform) 연출.

## 6. 기존 코드 변경

| 파일 | 변경 |
|---|---|
| `src/types.ts` | `AnimationKind`에 `'horse'` 추가 |
| `src/engine/randomKind.ts` | `KINDS`에 `'horse'` 추가 (4종 균등) |
| `src/components/GameStage.tsx` | `kind === 'horse'` → `<HorseRace>` 분기 추가 |
| `src/components/ChooseAnimation.tsx` | OPTIONS에 `{ option: 'horse', icon: '🏇', title: '경마', desc: '꼴찌로 들어온 말이' }` 추가 |
| `src/components/SetupScreen.tsx` | `OPTION_LABEL`에 `horse: '경마'` 추가 (NameSetup 경로) |
| `src/styles.css` | 트랙·레인·말·순위 뱃지 스타일 추가 |

`App.tsx`·`ScoreMode.tsx`는 타입 확장으로 자동 수용되므로 수정하지 않는다(카드 전용 라벨 분기는 영향 없음).

## 7. 랜덤 공정성

- 걸린 사람은 `pickWinner`(균등 분포 검증 완료)가 결정하고, 레이스 애니메이션은 확정된 결과를 재생할 뿐이다.
- `buildRaceProfiles`의 랜덤은 도착 순서 연출(누가 1등·2등…)에만 쓰이며 걸린 사람을 바꾸지 못한다.

## 8. 테스트

- `src/engine/race.test.ts` (신규, 주입 rand로 결정적):
  - `loserIndex` 말의 `finishTime`이 항상 최대인지
  - 모든 프로필의 진행도가 단조 증가하는지
  - `progressAt(p, p.finishTime) === 1`인지
  - `n`별(2~12) 프로필 개수·유효성
- 기존 `App.test.tsx`·`SetupScreen.test.tsx`가 게임 풀 4종 확장에 깨지지 않는지 확인하고 필요 시 갱신.
- 애니메이션 컴포넌트 자체는 기존 방침대로 단위테스트 대상에서 제외한다.

## 9. 범위 밖 (YAGNI)

- 베팅/배당, 말 고르기, 아이템·부스터
- 사운드 효과
- 결승 사진 판정(포토피니시) 리플레이
- 5번째 이상의 연출
