# F004 슬라이스 4 — 투자 우측 AI 코치 패널 (FE) — 회고

- 브랜치: `feat/f004-fe-coach-panel`
- 날짜: 2026-09-22
- 체크리스트: `requirements/reports/checklists/F004-fe-coach-panel.md`

## 1. 무엇을 했나

슬라이스 3 의 종목 판단 뷰모델을 투자 우측 패널에 이었다. 시세 프리뷰는 한 줄도 옮기지 않고 슬롯만 열어
①②③ 과 게이지 아래 한 줄을 끼웠다. 로컬 데이터가 전부 막혀 있어 **막힌 상태가 정상 화면으로 읽히는지**가
이 슬라이스에서 실제로 본 것이다.

## 2. 잘 유지된 것

- **FSD 경계를 우회하지 않았다.** 위젯 안 위젯 문제를 `pages` 주입 + `market` 쪽 슬롯으로 풀었다 — `market` 은
  `coach` 를 모르고, `market-board` 는 `coach-panel` 을 모른다
- **게이트는 컴포넌트 안.** `JudgmentSummary` 가 판별 union 으로 분기하고, 막힌 분기에는 꺼낼 필드가 없다
- **모드 전환 0 요청을 숫자로 확인했다.** REQ 문구(`router.replace`)대로 했으면 RSC 요청이 났다
- 첫 로드 번들 +0.17 kB — 패널을 `next/dynamic` 으로 둔 덕이다. 새 의존성 0

## 3. 남은 기술부채

- **뷰모델 타입이 두 벌이다**(BFF 원본 · `@repo/core/coach` 사본). 어긋나도 컴파일이 모른다. BFF 가
  `@repo/core` 를 읽을 수 있게 하거나(경로 import · 패키지 발행) 두 파일을 비교하는 계약 테스트가 필요하다
- **리터럴 union vs enum 규칙.** `layered-architecture.md` §6 · `FE-REQ-028` FR-73 은 enum 을 요구하지만
  BFF 원본이 리터럴 union 이다. BFF 소유 계약에 FE 규칙을 적용할지 정하지 않았다
- 시세 슬라이스는 여전히 `axios` 직접 호출이다. 코치 슬라이스는 `apiFetch` 로 시작했다 — 한 화면에 두 HTTP 경로
- 앱 로컬 토큰(`@/shared/ui/tokens.css`)을 새 CSS 에도 썼다 — `@repo/ui/tokens` 일원화 부채가 한 파일 늘었다

## 4. 다음에 보완할 규칙 · 문서

- `fsd-widgets.md` 에 "위젯 칸에 다른 위젯이 들어가면 `renderX` 슬롯 + 페이지 주입" 을 `pc-panel-grid` 옆에
  일반 규칙으로 한 줄 — 이번이 두 번째 사례다
- `FE-REQ-026` FR-112 · `FE-REQ-028` FR-83 은 이번에 개정했다. 상세 페이지(L절)도 같은 훅을 쓴다

## 5. 추가 검증 제안

- 표본이 쌓이면 `renderable: true` · `held_rule` · 게이지 줄을 `scratchpad` 의 같은 Playwright 스크립트로
- React Profiler 로 모드 전환 시 표 리렌더 0(FE-REQ-029 FR-71)
