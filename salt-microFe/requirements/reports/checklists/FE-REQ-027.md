# FE-REQ-027 (F004 FUNC) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-027-F004-FUNC.md`
- 브랜치: `feat/fe-f004-coach-report` (base `main` `dbce6cf`) · 검증일: 2026-09-23 — 코치 리포트(슬라이스 15)
- 상태: **부분** — 리포트에 걸린 FR 만. 패널 · 상세 분석 쪽 FR-80~95 는 슬라이스 4 · 6 에서 구현됐지만 이 체크리스트가 없었다(아래 §2 에 위치만 적는다)
- 루트: `requirements/reports/checklists/F004-fe-coach-report.md`

## 1. 리포트

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 · 2 | **pass** | `entities/coach/lib/renderGate.ts` `passesRecommendationGate` — 서버 `renderable` 그대로, `true` 인데 3종 · `scoreNote` 가 비면 그리지 않고 `console.warn`(개발) |
| FR-3 | **pass** | 위 파일 — 순수 함수. 종목 판단 게이트는 계속 `JudgmentSummary` 가 판별 union 으로 한다 |
| FR-4 | **pass** | 우회 prop · 플래그 · 환경변수 0 |
| FR-5 | **pass** | 막힘 사유 3종 → `COACH_MESSAGES.blocked`(`satisfies` 로 누락 컴파일 실패) |
| FR-6 | **pass** | 면책 없는 리포트는 BFF 가 `unavailable` → 한 줄 안내 |
| FR-7 | **pass** | `scoreNote` 없으면 게이트 실패 → 점수 없음 |
| FR-10~12 · 14 | **pass** | 점수 · 성적 · `priceGap` 표시만. 계산은 포맷(% · 부호 · 기간 `168h → 7일`)뿐 |
| FR-15 | **pass** | `staleHours` 서버 값 그대로 |
| FR-21 · 24 | **pass(grep)** | 추가 문구에 금지 표현 0 — "당신은" · "패닉셀러" · "실수" · "잘못" · "확실" · "보장" · "100%" · "목표주가" · "예상 수익률" |
| FR-22 · 23 | **pass** | `factCode` · `conditionCode` · `excluded.reasonCode` · `blockedReason` · `signalType` 매핑, 없으면 줄 없음 |
| FR-26 | **pass** | 익절 표 캡션 "내 보유 기록에 규칙을 적용한 가격 · 예측 아님" |
| FR-30~32 | **pass** | 주문 · 외부 링크 0 |
| FR-40 · 41 | **pass** | 쿨다운 길이 상수 없음 — `generation-status.retryAfterSeconds` 로 버튼 · 남은 시간 |
| FR-42 | **pass(코드)** | 1초 표시 타이머, 0 이면 `generation-status` 재조회 |
| FR-43 | **pass(코드)** | 429 본문 `retryAfterSeconds`(없으면 `Retry-After`) → 타이머. 토스트 0 |
| FR-44 | **pass** | mutation `retry: 0` · ref 연타 가드 |
| FR-45 · 46 | **pass(테스트 · 코드)** | `readGenerationOutcome`(`@repo/core`, 6 테스트) · 중단 조건 완료 · 실패 · 언마운트 · 15회 |
| FR-60 | **다르게** | 조회가 클라이언트 — 토큰이 `localStorage`(`FE-REQ-013` 전). 상세 분석과 같은 사정 |
| FR-70 | **pass(코드)** | `degradedFields` 의 블록만 "불러올 수 없음" |
| FR-71 | **부분** | "아직 추천이 없습니다" + [새로 생성]은 헤더에 늘 있다 |
| FR-72 · 94 | **pass(코드)** | 막힘 = 상단 안내 + 회색 상자. 오류 경계로 가지 않음 |
| FR-73 | **해당 없음** | 리포트의 `explanation` 은 `renderable:true` 에만 있고 늘 있다 |
| FR-50~54 · 61 · 62 | **미착수** | 피드백 · 주문 전 계산 · 성향 |

## 2. 패널 · 상세 분석 (슬라이스 4 · 6 — 위치만)

FR-80~93 · 95 는 `FE-REQ-026` 체크리스트 §2 · §5 가 근거다. FR-95(`TrackCaseList`)는 추천 근거 상세 전이라 미착수.
