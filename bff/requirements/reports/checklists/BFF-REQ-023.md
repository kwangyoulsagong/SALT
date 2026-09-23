# BFF-REQ-023 (F004 FUNC) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-023-F004-FUNC.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로 · 해설 인증에 더해 **코치 리포트 · 재생성 · 생성 상태 · 익절 · 행동 기록**(2026-09-23 슬라이스 14)이 닫혔다. 성적표 그룹(FR-20~24 · 103) · 피드백(FR-50~52) · preflight(FR-101) · 카운터(FR-7)는 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`
- **2026-09-22 슬라이스 5** (`feat/f004-bff-slice4`): 서버 4xx 전달 · `explain` 인증 · GET 재시도 — 루트 `checklists/F004-bff-upstream-errors.md`

## 1. 종목 판단 뷰모델 (FR-90~104)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-90 두 모드 한 응답 | pass | `symbol-coach.viewmodel.ts` `modes` |
| FR-91 `confidence` 0건 | pass | 필드 선택 복사 · `mapDecision` 줄 삭제 · 테스트 직렬화 검사 |
| FR-92 게이트 무가공 전달 | pass | `toModeViewModel` — 여는 경로 없음 |
| FR-93 "관망" 기본 라벨 0건 | pass | `getPreview` `badge ?? null` |
| FR-94 `mode` 기본값 서버 위임 | pass | `getDetail` — 없으면 쿼리에서 뺀다 |
| FR-95 `zone` 무가공 · `notPrediction` | pass | 서버 객체 그대로 |
| FR-96 `gaugeTrackRecords` 무가공 | pass | |
| FR-97 뉴스 병렬 · 실패 격리 | pass | `allSettled` · `degradedFields: ['news']` |
| FR-98 `validity.code` 무가공 | pass | |
| FR-99 목표가 기본값 0건 | pass | 테스트 |
| FR-100 `explain` 인증 뒤로 | pass | 슬라이스 5 — `authMiddleware` 뒤 · 토큰 전달 · 응답 무가공 |
| FR-101 preflight `stopLossRate` · `maxLossOfTotalRate` | 미착수 | |
| FR-102 관심 종목 뷰모델에 판단 필드 0건 | pass | `watchlist.viewmodel.ts` 무변경 |
| FR-103 성적표 분포 · hits · misses | 미착수 | `/coach/report` 와 함께 |
| FR-104 알림 만들기 경로 0건 | pass | 추가한 경로 없음 |

## 2. 나머지 절

| FR | 판정 | 비고 |
|---|---|---|
| FR-1~6 게이트 전달만 | pass | 종목 경로 + **코치 리포트**(2026-09-23) — `toReportRecommendation` 에 여는 경로 없음 · 막힌 추천은 사유 · 표본 수만 · 테스트 5 |
| FR-7 게이트 미충족 카운터 | 미착수 | 관측 인프라 미정 |
| FR-10~14 `/coach/report` | **pass** (2026-09-23) | 서버 1회 · 800ms · 재시도 1회 · 5xx/타임아웃/계약 깨짐 → 200 `unavailable` · 4xx 는 올림 · `staleHours` 무가공. FR-11 은 **계약이 깨진 필드**를 `degradedFields` 에 적는 것으로 읽었다 — 서버의 `recommendation: null` 은 추천 없음이지 결측이 아니다 |
| FR-20~24 성적표 그룹 | 미착수 | |
| FR-30~32 익절 플랜 | **pass** (2026-09-23) | `profit-plan` 카드가 `stages` 를 통째로 넘겨 `gapFromCurrent` 가 간다 · BFF 에 `crypto` 필터 없음(서버가 건다) · 리포트 `exitPlans[].trendHold.conditionCode` 무가공 |
| FR-40~41 행동 기록 `factCode` | **pass** (2026-09-23) | `behavior-coach` 카드에 `factCode` · `params` 추가, 기존 필드 유지 · 리포트 `behaviorFacts` 무가공. FR-42 는 ADR-002 로 무효 |
| FR-50~52 피드백 `reasonCode` | 미착수 | |
| FR-60 `generate` 429 + `Retry-After` 전달 | **pass** (2026-09-23) | 에러 미들웨어가 **본문 `retryAfterSeconds` 를 떨구고 있었다**(헤더만 옮겼다) — 고쳤다. BFF 경유 실측: 429 · `Retry-After: 300` · 본문 `retryAfterSeconds: 300` |
| FR-61 · FR-62 BFF 쿨다운 상태 0 · 재시도 0 | pass | 프록시 경로 · 상태 없음 |
| FR-63 `generation-status` | **pass** (2026-09-23) | `/api/app/coach/generation-status` · 300ms · 재시도 1회 · 필드 선택. 실측 수동 생성 뒤 `retryAfterSeconds: 298` |
| FR-70~72 `explain` 인증 | pass | 슬라이스 5. FR-72 요청 제한은 서버(분당 10) — BFF 는 동시 수만 |
| FR-80~84 하지 않는 것 | pass | 점수 · LLM · 문구 · 주문 코드 0건 (이 브랜치 diff 기준) |

## 서버 선행 상태 — 2026-09-23 (BFF 변경 없음)

서버 슬라이스 12 가 BFF 가 기다리던 계약 셋을 열었다. **BFF 코드는 바뀌지 않았고** 판정도 그대로다 — 기록만 남긴다.

| FR | 서버 쪽 | BFF 상태 |
|---|---|---|
| FR-10~14 `/coach/report` | `GET /api/coach/detail` 생김 | 미착수 — 부르는 라우트가 없다 |
| FR-30~32 익절 플랜 | `stages[].gapFromCurrent` 추가 | `stages` 를 통째로 넘겨 **이미 전달된다**(코드 읽기로만 확인) |
| FR-40~41 행동 기록 | `warnings[].factCode` · `params` 추가 | 미착수 — `app-behavior-coach.service` 카드 매핑이 두 필드를 **떨군다** |

근거: `salt-server/requirements/reports/checklists/SRV-REQ-025.md` §8

## 서버 선행 상태 — 2026-09-23 두 번째 (BFF 변경 없음)

서버 슬라이스 13: `POST /api/ai-coach/generate` 가 **202**(BREAKING — 본문이 추천이 아니라 `{ requestId, requestedAt }`),
쿨다운 429 + `Retry-After`, `GET /api/coach/generation-status` 신설. BFF 의 `generate` 는 프록시라 본문 변화의 영향이 없다.

| FR | 서버 쪽 | BFF 상태 |
|---|---|---|
| FR-60 `Retry-After` 전달 | 서버가 이제 보낸다 | 부분 그대로 — BFF 경유 실측 전 |
| FR-63 `generation-status` | 서버 엔드포인트 생김 | 미착수 — 부르는 라우트가 없다 |

## 슬라이스 14 — 코치 리포트 · 재생성 전달 (2026-09-23, `feat/bff-f004-coach-report`)

BFF 경유 실측(로컬 테스트 계정 로그인 → 실제 토큰):

| 경로 | 결과 |
|---|---|
| `GET /api/app/coach/report` | 200 · **8ms** · `status: ok` · 면책 · `excluded` 국내 주식 · `degradedFields: []`. 이 계정은 보유가 없어 추천 `null` |
| `POST /api/ai-coach/generate` 1차 | **202 · 8.5ms** · `{ requestId, requestedAt }` |
| 같은 요청 2차 | **429** · `Retry-After: 300` · 본문 `code: COACH_REGENERATE_COOLDOWN` · `retryAfterSeconds: 300` |
| `GET /api/app/coach/generation-status` | 200 · 생성 뒤 `lastRequest.source: manual` · `succeeded` · `retryAfterSeconds: 298` |
| `GET /api/app/behavior-coach` · `profit-plan` | 200 · 이 계정은 거래 0 · 보유 0 이라 빈 목록 |
| 무토큰 `report` | 401 |
| 게이트 | `npm run build` · `npm test` **99 pass**(+17) |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천이 있는 사용자의 리포트(막힌 추천 · 익절 계획 · 행동 기록이 채워진 모양) 실측 | 로그인할 수 있는 로컬 계정은 보유 · 거래가 없다. 서버 실제 응답 모양으로 단위 테스트는 했다 | 테스트 계정에 보유를 기록한 뒤 |
| FR-7 게이트 차단 카운터 | 관측 인프라 미정 | 관측성 계측 |
| 모바일 집계 1콜 | 모바일 소비처가 없다 | `RN-REQ-*` 코치 화면 |

