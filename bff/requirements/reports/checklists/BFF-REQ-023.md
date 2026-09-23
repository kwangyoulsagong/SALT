# BFF-REQ-023 (F004 FUNC) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-023-F004-FUNC.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
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
| FR-1~6 게이트 전달만 | pass (종목 경로) | 코치 리포트 경로는 아직 없다 |
| FR-7 게이트 미충족 카운터 | 미착수 | 관측 인프라 미정 |
| FR-10~14 `/coach/report` | 미착수 | |
| FR-20~24 성적표 그룹 | 미착수 | |
| FR-30~32 익절 플랜 | 미착수 | |
| FR-40~41 행동 기록 `factCode` | 미착수 | FR-42 는 ADR-002 로 무효 |
| FR-50~52 피드백 `reasonCode` | 미착수 | |
| FR-60 `generate` 429 + `Retry-After` 전달 | 부분 | 슬라이스 5 — 4xx → 500 변환을 고쳤고 프록시가 `Retry-After` 를 옮긴다. **서버에 쿨다운 · `Retry-After` 가 없다** |
| FR-61 · FR-62 BFF 쿨다운 상태 0 · 재시도 0 | pass | 프록시 경로 · 상태 없음 |
| FR-63 `generation-status` | 미착수 | 서버 엔드포인트 없음 |
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

