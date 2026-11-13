# BFF-REQ-026 (F004 PERF) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-026-F004-PERF.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
> **2026-10-29 전수 조사:** 위 상태 줄은 작성 당시 — 이후 닫힌 절(B · C절 10-27 · 10-28, 코치 리포트 · 재생성 · 해설 인증 슬라이스 5 · 14)은 본문 표가 진실
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`
- **2026-09-22 슬라이스 5** (`feat/f004-bff-slice4`): 서버 4xx 전달 · `explain` 인증 · GET 재시도 — 루트 `checklists/F004-bff-upstream-errors.md`

## 1. 종목 판단 경로 (FR-50~54)

| FR | 판정 | 실측 · 근거 |
|---|---|---|
| FR-50 p95 200ms · 병렬 | **pass** | 로컬 BTC 100회(워밍 후) p50 7ms · **p95 32ms** · max 74ms. 서버 직접 p95 33ms. tsx 재기동 직후 40회는 p95 344ms — 첫 호출 워밍, 기록만 |
| FR-51 모드 전환 무호출 | pass | 두 모드 한 응답 |
| FR-52 클라이언트 종료 → upstream 취소 | pass (코드) | `res.on('close')` → `AbortController`. **실측 안 함** |
| FR-53 새 캐시 0건 | pass | |
| FR-54 p95 · 호출률 · 모드별 미렌더율 · news degraded 비율 관측 | 미충족 | 관측 인프라 미정 |

## 2. 나머지

| FR | 판정 | 비고 |
|---|---|---|
| FR-1 `explain` 동시 2 | pass | 슬라이스 5 — 초과는 대기열 없이 429 `explain_busy`. 실측 3건 동시 → 1건 429(20ms) |
| FR-2 · FR-3 `explain` 20s · 재시도 0 | pass | 슬라이스 5 |
| FR-4 `generate` 202 · 1s | 미충족 | 서버가 동기 LLM 호출 |
| FR-5 LLM 경로 커넥션 별도 측정 | 미충족 | 관측 인프라 미정 |
| FR-6 프론트 디바운스 | 해당 없음 (BFF) | 해설 버튼이 아직 없다 — FE 상세 분석 페이지 |
| FR-10~13 `/coach/report` 서버 1회 | 미착수 | |
| FR-20~21 BFF 캐시 0건 | pass | 이 브랜치가 추가한 캐시 없음 |
| FR-30~32 응답 크기 | 부분 | 뉴스에서 `summary` · `sentiment` 를 빼 줄였다. 리포트 경로는 미착수 |
| FR-40~45 게이트 카운터 · LLM 관측 | 미착수 | FR-45 before/after — 새 경로라 before 없음 |

## 2026-10-28 — F000 웹 API 에러 정규화 (짝 영역 변경 없음)

웹이 이 경로의 실패를 `ApiError { status, code, retriable }` 로 받게 바뀌었다(`FE-REQ-012`). 이 영역 코드 · 계약 **변경 없음** — 파일 머리 주석 참조뿐.

## 2026-10-29 주석 정정

- **변경 없음(BFF).** 프론트 `entities/coach/api/coachApi.ts`(머리 주석이 이 REQ 를 가리킨다)의 리스크 예산 호출 주석 "게이지 3" → "게이지 · 측정". BFF 코드 무변경. 훅 exit 0 · `web` check-types · lint
- 2026-10-29 전수 조사: 예산표 generate 경로 정정

## 2026-10-30 — F004 슬라이스 18 설정 화면

- 파일만 걸침 — 웹 `coachApi.ts`(이 REQ 가 머리 주석 주인) 설정 조회가 응답 매퍼(`toCoachProfileSettings`)를 쓴다. BFF 무변경
- 미검증 · 범위 밖: 없음

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 검증

`npm run build` · `client-kind.util` 테스트

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 파일만 걸침 — `packages/domain-invest/src/entities/coach/api/coachApi.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05

## 2026-11-10 — F018 걸침

  - `salt-microFe/packages/domain-invest/src/entities/coach/api/coachApi.ts` — "국내 소유자 전용" 주석 정정(`ADR-011`)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `ai-coach.controller.ts` 에 `tradeCheck` — 요청 취소(abort)를 서버 호출까지 전파. 기존 핸들러 무변경 · `npm run build` · `npm test` 450 통과 · 실호출 200 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 스트림 컨트롤러 삭제 · 새 경로 예산 | 충족 | `ai-coach.controller.ts` · 실호출 3~115ms |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 판단 상세 경로 영향 | 충족 | 같은 컨트롤러 파일에 `scenario` 핸들러만 더함 — `detail` 코드 변경 0, BFF 테스트 456/456 |

## F017 v4 순서 1a 짝 (2026-11-13) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/in-progress/F017-v4-stage1-panel-slice.md` · 체크리스트 `requirements/reports/checklists/F017-v4-stage1-panel.md`

| 바뀐 것 | 확인 |
|---|---|
| `ai-coach.routes.ts` 시나리오 줄 주석(누구나 · 지평 넷) — 이 REQ 의 판단 상세 경로 변경 0 | 서버 build · lint · test 1325 · layer-check / BFF build · test 481 / FE check-types 13/13 · lint 13/13 · test(core 298 · ui 63) · 레이어 훅 사후(대조군 둘 exit 2 → 23파일 0) · 실스택(BFF 4001 — 비소유자 · 소유자 시험 토큰, BTC · 005930) · 실화면 1440 · 390 앱 UA |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |
