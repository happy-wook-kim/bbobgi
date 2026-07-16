---
name: verify
description: bbobgi 변경사항을 브라우저로 구동해 검증하는 레시피 (Vite dev + Playwright)
---

# bbobgi 검증 레시피

## 빌드·실행

```bash
pnpm test                          # vitest (엔진 순수함수만)
pnpm build                         # tsc --noEmit + vite build
pnpm dev --port 5199 --strictPort  # dev 서버 (백그라운드로)
```

## 브라우저 구동

- Playwright를 스크래치패드에 `npm i playwright`로 설치.
- **주의:** 이 머신의 ms-playwright 캐시와 최신 playwright 버전이 안 맞을 수 있다.
  `chromium.launch({ channel: 'chrome' })`로 설치된 Google Chrome을 쓰면 다운로드 없이 동작.
- viewport는 `{ width: 480, height: 900 }` (모바일 우선 레이아웃, .app max-width 480px).

## 게임별 자동 플레이

| 게임 | 진입 셀렉터 | 완주 방법 | 소요 |
|---|---|---|---|
| 카드 | `.card-grid` | `.flip-card`를 순서대로 클릭(뒤집기 전환 ~700ms 대기) | ~n초 |
| 룰렛 | `.wheel` | `돌리기` 클릭 후 대기 | 최대 ~25s (보너스 스핀) |
| 사다리 | `.ladder-svg` | `시작` 클릭 후 대기 | ~n×3s |
| 경마 | `.race-track` | `출발` 클릭 후 대기 | ~12s |
| 주사위 | `.dice-board` | 모드 선택 → `던지기` → (선택) Space/보드 탭 슬램 → 정지 대기 | ~3s+슬램 |

- 판 종료 감지: `.winner-overlay`(일반 모드) 또는 `.scoreboard`(점수 모드) 대기.
- 일반 모드 반복: `한번 더` 버튼. 점수 모드 반복: `다음 판` 버튼.
- 점수 모드 목표 점수 상한은 10 (기본 3, `+` 버튼 최대 7번).

## 알려진 문제 (변경과 무관)

- `/favicon.ico` 404 — index.html에 아이콘 링크가 없음 (기존부터).
- `.screen` 진입 시 fade-up 0.4s 애니메이션 — 스크린샷은 ~700ms 대기 후 촬영.
