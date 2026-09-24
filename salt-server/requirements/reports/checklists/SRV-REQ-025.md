# SRV-REQ-025 (F004 API) — 검증 체크리스트

- REQ: `salt-server/requirements/specs/in-progress/SRV-REQ-025-F004-API.md`
- 브랜치: `feat/f004-symbol-judgment`(PR #48, `6f701b4`) → `feat/f004-zone-gauge`(PR #49, `ebadcf9`) · 검증일: 2026-09-21
- 작성: 2026-09-22 (backfill — 루트 체크리스트 두 개와 `src/coach` 코드에서 옮겼다. 새로 돌린 검증은 없다)
- 상태: **부분 완료** — 종목 경로 계약(FR-40~47) · **explain · preflight**(FR-11 · 12 · 14 · 20 · 50~52, 슬라이스 10) · **성적표 그룹**(FR-15 · 53, 2026-09-23 슬라이스 11) · **코치 상세**(FR-1~9 · 16~18, 2026-09-23 슬라이스 12) · **쿨다운 · 프로필**(FR-10 · 13 · 48, 슬라이스 13)이 닫혔다. 남은 것은 FR-19(부분) · 31 · 54
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-symbol-judgment.md` · `F004-zone-gauge.md`

판정 정의는 `SRV-REQ-024.md` 체크리스트 머리와 같다.

## 1. 기존 경로 확장 · 신규 경로 (FR-1~20)

| FR | 내용 | 판정 | 비고 |
|---|---|---|---|
| FR-1~9 | 저장 추천 응답의 게이트 · `scoreNote` · `disclaimer` · `excluded[]` · `behaviorFacts` · `conditionCode` | **pass** (2026-09-23) | §8. `GET /api/coach/detail`. FR-3 의 `null` 경로는 생기지 않는다 — 매핑이 계산식(`coach.<action>`)이라 늘 객체이고, 표본 0 이 막힌다(FR-43 과 같은 사정) |
| FR-10 | generate 쿨다운 429 | **pass** (2026-09-23) | §9. 202 비동기 · 429 + `Retry-After` + `retryAfterSeconds` · `/api/coach/generation-status` |
| FR-11~12 | explain 인증 · rate limit | **pass** (2026-09-22) | §6. 인증은 라우트 순서를 바꿔 `authMiddleware` 뒤로, 분당 10회는 유지 |
| FR-13 | profile 영속화 | **pass** (2026-09-23) | §9. `unsupportedPersistedFields` 제거 — BFF 는 `?? []` 로 읽어 깨지지 않는다 |
| FR-14 | preflight 차단 필드 금지 | **pass** (2026-09-22) | 추가 필드는 `stopLossRate` · `maxLossOfTotalRate` 뿐 |
| FR-15 | `signal-performance?groupBy=signalType` · 무인자 하위 호환 | **pass** (2026-09-23) | §7. 응답 모양이 다른 두 계약이라 쿼리로 갈랐다. `/api/coach/scoreboard` 가 같은 표 |
| FR-16~18 | `gapFromCurrent` · `factCode` · `staleHours` | **pass** (2026-09-23) | §8. `profit-plan` `stages[].gapFromCurrent` · `behavior-coach` `warnings[].factCode`/`params` 는 **추가만**. `staleHours` 는 payload `generatedAt` 기준(행이 덮어쓰기라 `createdAt` 은 첫 생성 시각) |
| FR-19 | 금액 원 단위 정수 | **부분** | preflight `maxLossAmount` 만(2026-09-22). 상세의 `behaviorFacts[].amountKrw` 는 늘 `null`(세 판정이 금액을 세지 않는다). 가격선은 호가 통화 가격이라 이 FR 의 대상이 아니다 |
| FR-20 | Swagger explain public 표시 제거 | **pass** (2026-09-22) | `bearerAuth` · 401 · 429 · `renderable:false` 설명 |

## 2. 하위 호환 (FR-30~32)

| FR | 내용 | 판정 | 비고 |
|---|---|---|---|
| FR-30 | 필드 추가만 · 예외는 종목 경로 `confidence` | pass (종목 경로) | 종목 경로는 `modes` · `gaugeTrackRecords` · `disclaimer` 추가, `modeDecision` · `dualDecision` 유지. explain **요청** 스키마에서 필수 `confidence` 도 빠졌다 — `z.object` 가 모르는 키를 버려 보내던 쪽은 깨지지 않는다 |
| FR-31 | BFF 프록시 대상 계약 테스트 | 미착수 | 유닛 · 유스케이스 테스트만 있다 |
| FR-32 | explain 인증 시 BFF 토큰 전달 | **pass** | BFF 가 먼저 보내고 있었다(`app-ai-coach.service.explain`). 실측 BFF 경유 200 |

## 3. 종목 판단 계약 (FR-40~54)

| FR | 내용 | 판정 | 위치 |
|---|---|---|---|
| FR-40 | `modes.scalp` · `modes.longTerm` 항상 | pass | `GetSymbolCoach` |
| FR-41 | `confidence` 제거 (`modes` · `modeDecision` · `dualDecision`) | pass | `ModeDecision` 타입에서 제거(`policy/modeDecision.ts`). **BFF `mapDecision` 은 `undefined` 를 옮긴다** — `BFF-REQ-025` |
| FR-42 | 모드마다 `renderable` · `blockedReason` 항상 · 200 | pass | `lib/judgmentTrack.ts` `attachJudgmentTrack` |
| FR-43 | 표본 0 `{sample: 0, winRate: null}` ↔ 매핑 없음 `null` | pass | `summarizeJudgmentTrack`. 매핑이 계산식이라 `null` 경로는 생기지 않는다 |
| FR-44 | `zone` 판별 union · `stages` 3개 · `lower ≤ mid ≤ upper` · 예측 필드 0건 | pass | `policy/zone.ts` — 정렬로 못 박음 |
| FR-45 | `validity.code` 유일한 출처 | pass | `VALIDITY_CODE` |
| FR-46 | 게이지 표본 0 은 빠짐 · < 20 `lowSample` | pass | `toGaugeTrackRecord` |
| FR-47 | `disclaimer` 항상 | pass | `JUDGMENT_DISCLAIMER` |
| FR-48 | `mode` 없으면 `defaultMode` → `scalp` | **pass** (2026-09-23) | §9. `GetSymbolCoach` — 요청 → 프로필 → `scalp`. 실제 DB 로 `long_term` 저장 → `mode` 없는 요청이 `long_term` |
| FR-49 | `preview=true` 에서 `zone` · 게이지 생략 가능 | 범위 밖 | 슬라이스 2 가 뺐다. 지금은 `preview` 에서도 `zone` 을 싣는다(REQ Changelog — 생략은 허용일 뿐) |
| FR-50~52 | explain 미렌더 시 LLM 미호출 · `newsSummary` ≤ 5 · preflight `stopLossRate` / `maxLossOfTotalRate` | **pass** (2026-09-22) | §6 |
| FR-53 | 성적표 `returnDistribution` · `hits` · `misses` | **pass** (2026-09-23) | §7. 구간 6개 + 사분위수. **`horizonDays` 는 30 고정이 아니라 그룹의 관찰 기간**(단타 1 · 장기 30) — 아래 "다르게" |
| FR-54 | 관심 종목 응답에 판단 필드 없음 | 미착수 | 두 슬라이스가 watchlist 를 건드리지 않았다. 확인하지 않았다 |

## 4. 집계

| 판정 | FR 수 |
|---|---|
| pass | 34 (FR-30 종목 경로 · FR-40~47 · FR-11 · 12 · 14 · 15 · 20 · 32 · 50 · 51 · 52 · FR-1~9 · 16~18 · **FR-10 · 13 · 48**) |
| 다르게 | 1 (FR-53 — `returnDistribution.horizonDays` 를 그룹 기간으로) |
| 부분 | 1 (FR-19 — preflight 만) |
| 미충족 | 0 |
| 범위 밖 | 1 (FR-49) |
| 미착수 | 2 (FR-31 · FR-54) |

> 2026-09-23 정정: 슬라이스 11 시점 미착수는 15 가 아니라 **16** 이었다(FR-1~10 이 10개). 이번 12개가 빠져 4 다.

## 5. 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| BFF 가 새 필드(`modes` · `zone` · `gaugeTrackRecords`)를 전달하는지 | BFF 슬라이스 전이다 | `BFF-REQ-023~025` |
| `SymbolCoachResult.assetType` | 응답에 없다 | F004 후속 |

## 6. 슬라이스 10 — explain · preflight (2026-09-22, `feat/server-f004-followup`)

| 확인 | 결과 |
|---|---|
| explain 무토큰 | **401**(전: 200 공개) |
| explain 판단 미렌더 | BTC 두 모드 **LLM 호출 0 · 26ms / 6ms** 200 `{renderable:false, blockedReason:"insufficient_sample"}` — 로컬 판단 표본이 없다 |
| explain 렌더 경로 | 단위 테스트 3(막힘 2 · 렌더 1: 성적표 · 실패사례 · `validity` · 판단 경로 면책 · signal 전달 · `expectedReturn` 0) |
| preflight `stopLossRate` | BFF 경유 −3% → `stopPrice` 110,580,000 · `maxLossAmount` 15,000(정수) · `maxLossOfTotalRate` 0.00141. `stopPrice` 가 있으면 그것이 이긴다. 없으면 셋 다 `null`. 양수 400 |
| 게이트 | `npm run build` · `npm test` **262 pass** · eslint `src/coach` · `test:layer-check` |

### 판단

- **면책을 판단 경로 문장으로 바꿨다.** 모델이 쓴 면책은 확신 표현이 섞일 수 있고, 같은 카드의 두 면책이 다르면 안 된다
- `maxLossOfTotalRate` 는 기존 `maxLossRate` 와 **같은 값**이다(분모가 이미 진입 후 총 평가금액). 뜻이 드러나는 이름을
  더하고 옛 이름은 하위 호환으로 남겼다
- 스펙의 `source: 'llm' | 'rule'` 은 싣지 않았다 — 서버에 규칙 기반 해설이 없다(실패하면 프론트가 규칙 문장을 그린다)

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~LLM 을 실제로 부르는 렌더 경로~~ | ~~로컬 판단 표본이 20 미만~~ | **2026-09-23 닫힘** — 표본 시드로 실측(§7) |
| explain abort 실측 | 끊김 후 Gemini 중단은 서버 로그로만 보인다 | 관측성 계측 |
| ~~`newsSummary` 뉴스 수 상한 실측~~ | — | **2026-09-23 닫힘** — 뉴스 1건 → 1줄(§7) |
| PM 프로토타입 | explain 인증으로 공개 데모가 깨진다(스펙 Open Questions) | PM 확인 |

## 7. 슬라이스 11 — 성적표 그룹 · 표본 시드 (2026-09-23, `feat/server-f004-coach-report`)

| 확인 | 결과 |
|---|---|
| `GET /api/coach/scoreboard` | 200 · 23ms · 그룹 8 · `status: ok` · 무토큰 **401** |
| `?groupBy=signalType` | 200 · 10ms · 같은 표. `groupBy=symbol` 은 **400** |
| 무인자 하위 호환(FR-15) | 옛 키 그대로 — `sampleCount` · `winRate` · `avgReturn` · `maxDrawdown` · `samples` |
| 분포 무손실 | 그룹 8개 전부 **구간 합 = 표본 수**. 경계 11개에서 SQL 과 `returnBucketCode` 전부 일치 |
| 적중/실패 동등(FR-161) | 키 집합 동일 · 상한 3 · `event` = 그룹 키 |
| 쿼리 · 계획 | 2회(그룹 집계 · `ROW_NUMBER()` 사례). 248행에서 Seq Scan · 1.45ms · 0.39ms |
| 표본 시드 | 240건 삽입 → 재실행 0건(자정 앵커 + `(symbol, mode, judgedAt)` 유니크). 8그룹 `gateOpen` |
| explain 렌더 경로 | `renderable: true` · **2.73s** · `trackRecord`(표본 32) · `failureCases` 3 · `newsSummary` 1줄 · `expected*` 0건 |
| 게이트 | `npm run build` · `npm test` **274 pass** · `eslint .` · `layer-check` 8파일 |

### 판단

- **`horizonDays` 를 30 고정으로 두지 않았다("다르게").** 계약 초안은 리터럴 30 이었으나 단타
  관찰 기간은 24시간이다. 30 이라고 쓰면 단타 그룹의 분포가 거짓이 된다 — 그룹 키가
  `<mode>.<action>` 이라 기간이 확정되므로 그룹이 자기 기간을 말한다. `trackRecord.horizonHours`
  와 같은 출처(`JUDGMENT_HORIZON_MS`)다
- **그룹은 판단 스냅샷에서 온다.** 무인자 경로(저장 추천 이력 + 현재가)와 소스가 다르다.
  무인자 응답을 바꾸지 않는 것이 FR-15 라서 한 경로에 두 계약이 남았다
- 승률 · `lowSample` 은 판단 블록과 **같은 함수**(`summarizeJudgmentTrack`)를 쓴다. 같은 숫자가
  두 화면에서 다르면 안 된다
- 구간 경계는 도메인 `RETURN_BUCKETS` 한 곳이고 SQL 이 그 배열을 펼친다

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 표본 수만 건일 때의 집계 계획 | 248행에서는 Seq Scan 이 맞다 | 표본 누적 후 재측정 |
| BFF `/api/app/coach/scoreboard` 전달 | BFF 슬라이스 전이다 | `BFF-REQ-023` FR-20~24 |
| explain abort | 서버 로그를 잡지 않았다 | 관측성 계측 |

## 8. 슬라이스 12 — 코치 상세 (2026-09-23, `feat/server-f004-coach-detail`)

| 확인 | 결과 |
|---|---|
| `GET /api/coach/detail` 유스케이스 · 실제 DB | 조립 **16ms**(로컬 사용자 1명 · 보유 2). 추천 `coach.sell` BTC · `renderable: false` · `blockedReason: failure_cases_missing` · 성적 표본 1(`lowSample: true`) · `explanation.source: rule` · 후보 3 · 익절 계획 2 · `excluded` 국내 주식 |
| HTTP 무토큰 | **401** — 라우터 전체에 `authMiddleware` 가 걸려 있어 이 값만으로 경로 등록을 증명하지는 않는다. 등록은 유스케이스 호출과 `tsc` 로 봤다 |
| 새 SQL | **없음** — 기존 Store · Probe 메서드만(`findLatestRecommendation` · `findRecommendationHistory` · `findActiveBehavior` · `listHoldings` · `quotes` · `latestCloses` · `closeAtOrAfter`). `EXPLAIN` 대상 없음 |
| 쿼리 수 | 고정 5 + 같은 행동의 저장 추천 수만큼 `closeAtOrAfter`(기존 `signal-performance` 와 같은 루프 · 상한 100). 저장 추천이 `main_coach` 한 행을 덮어써서 지금은 1 |
| 응답 금지 필드 | `targetPrice` · `expectedReturn` · `confidence` · `probability` 0건(유스케이스 테스트) |
| 게이트 | `npm run build` · `npm test` **299 pass** · `npm run lint` · `test:layer-check` · `layer-check` 사후 17파일 |

### 판단

- **저장 추천에 종목 판단 성적을 빌려 오지 않았다.** 슬라이스 11 이 미결로 남긴 질문이었는데 스펙이 이미 답하고 있었다 —
  `DB-REQ-019` FR-45 가 "저장 추천 4행은 `IndicatorTrackRecord` 와 연결되는지가 데이터이고 연결이 없는 행은 게이트가
  차단한다"고 쓴다. 스냅샷을 빌리면 `coach.sell` 카드에 `long_term.avoid` 의 실패사례가 붙는다(SRV-REQ-024 FR-134 와 같은 이유)
- 그래서 추천 블록은 **지금 전부 막힌다.** 에러가 아니고 200 이며 나머지 블록(익절 계획 · 행동 기록 · 후보)은 그대로 간다
- 저장 추천 게이트는 표본 **1건 이상이면 통과**(`SRV-REQ-024` FR-32 기본안)다. 종목 판단은 20 미만을 막는다(FR-137).
  두 경로가 다른 것은 스펙이 정한 것이고, 계약의 사유 enum 에도 `insufficient_sample` 이 없다
- 성적 표본은 `signal-performance` 와 **같은 함수**(`collectPerformanceSamples`)로 센다. 키는 폴백 체인이 아니라
  `coach.<action>`(FR-130)
- 상세 GET 은 **쓰기를 하지 않는다.** 행동 코치 화면은 열 때 분석을 돌리지만 상세는 있는 것만 모은다

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 블록이 `renderable: true` 로 열리는 경로(실측) | 실패사례 출처 `IndicatorTrackRecord` 가 없다 — 단위 테스트(게이트 4종)만 | `DB-REQ-013` · `DB-REQ-019` 매핑 시드 (F003) |
| ~~인증된 HTTP 200 실측~~ | — | **2026-09-23 닫힘** — BFF 슬라이스 14 에서 실제 로그인 토큰으로 BFF 경유 실측(`/api/app/coach/report` 200 · 8ms) |
| `coach.sell` · `coach.hold` 의 적중 정의 | 기존 성적 정의가 행동과 무관하게 "지금 가격 > 진입가"다 — 매도 추천이 가격 상승으로 "적중"한다. 이번 슬라이스는 정의를 바꾸지 않고 옮겨 썼다 | PM 판단 — 저장 추천용 적중 규칙(FR-135 의 저장 추천판) |
| 후보 `reasons` | 저장 payload 에 없다(늘 `[]`). 생성 쪽 변경이 필요하다 | `generate` 슬라이스(쿨다운과 함께) |
| `recommendation.assetType` 의 `us_stock` | DB enum 이 `stock` 하나라 미국 주식으로 읽는다(`DB-REQ-003`). 로컬에 주식 추천이 없어 보지 못했다 | `DB-REQ-003` |
| ~~BFF 전달~~ | — | **2026-09-23 닫힘** — BFF 슬라이스 14(`/api/app/coach/report` · 카드 `factCode`/`params`) |

## 9. 슬라이스 13 — 쿨다운 · 프로필 (2026-09-23, `feat/server-f004-coach-cooldown`)

| 확인 | 결과 |
|---|---|
| 마이그레이션 2 | 프로필 열 2 · 생성 기록 테이블 1. `--create-only` 로 SQL 확인 → `migrate deploy`. `prisma validate` · `migrate status` 통과 |
| 프로필 실측 | `long_term` · `low` 저장 → DB 열 확인 → 다시 조회 그대로 · `unsupportedPersistedFields` 없음 → `mode` 없는 종목 판단 `long_term`. 원래 값(`null`)으로 되돌리니 `scalp` |
| 재생성 실측 | 1차 요청 **5ms** 에 받음(`running`) → 즉시 2차 요청 **거부 `retryAfterSeconds: 300`** → 생성 48ms 뒤 `succeeded` · `llmSource: rule`. 거부 행은 `lastRequest` 로 보이지 않았다. 실측 행 2개는 지웠다 |
| 쿼리 계획 | 새 쿼리 2개 모두 `coach_generation_logs_user_id_requested_at_idx` Bitmap Index Scan · **0.047ms · 0.045ms** (8행) |
| 워커 기록 | 떠 있는 로컬 서버가 새 코드로 워커 생성을 기록하는 것 확인(`source: worker` · 43~244ms) |
| HTTP 무토큰 | `generation-status` · `generate` 401 |
| 게이트 | `npm run build` · `npm test` **318 pass**(+19) · `npm run lint` · `test:layer-check` · `layer-check` 사후 전 파일 |

### 판단

- **202 로 바꿨다(BREAKING).** BFF 는 1s 타임아웃으로 202 를 기대하고(`BFF-REQ-025` FR-3), 소비처는 BFF 프록시뿐 —
  본문을 읽는 곳이 없다. 결과는 상세 · 상태 경로로 본다
- **기록을 받는 순간 만든다.** 생성이 끝날 때 쓰면 그 사이 두 번째 요청이 쿨다운을 통과한다. 그래서 스펙의 상태 셋에
  `running` 을 더했다(`DB-REQ-017` "다르게")
- **쿨다운 기준은 받아들인 수동 요청.** 거부를 기준으로 삼으면 연타가 쿨다운을 무한히 늘리고, 실패를 빼면 실패하는
  생성을 연타로 반복한다
- 쿨다운은 에러가 아니라 **결과 타입**이다. `ErrorKind` 에 값을 늘리지 않았다(`ddd-shared.md` §2 — 전 컨텍스트 합의 사항)
- 같은 순간의 두 요청은 둘 다 통과할 수 있다(확인 → 기록 사이). 사용자 ≤10명 · 버튼 하나라 잠금을 두지 않았다 —
  겹치면 생성이 두 번 돌 뿐 추천은 덮어쓰기다

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~인증된 HTTP 202 · 429 실측~~ | — | **2026-09-23 닫힘** — BFF 슬라이스 14 에서 실제 로그인 토큰으로 BFF 경유 실측(202 · 8.5ms → 429 `Retry-After: 300`) |
| ~~BFF 가 `Retry-After` 를 옮기는지~~ | 헤더는 옮겼지만 **본문 `retryAfterSeconds` 는 떨구고 있었다** — BFF 슬라이스 14 가 고쳤다 | **2026-09-23 닫힘** |
| 생성 기록 보존 · 정리 | 워커가 사용자당 10분에 1행 | 관측성 계측 |
| **로컬 워커 중복 실행** | 로컬에 `src/server.ts` 가 두 벌 떠 있어 워커 생성이 매번 **두 번** 돈다 — 새 기록에서 처음 보였다. 코드가 아니라 로컬 프로세스 문제 | 사용자가 로컬 프로세스 정리 |

## 10. F009 슬라이스 0 — C04 `worstObservedReturn` (2026-09-24, `feat/f009-slice0-reliability`)

루트: `requirements/reports/checklists/F009-slice0-reliability.md`

| FR | 판정 | 근거 |
|---|---|---|
| FR-55 이름 정정 | **pass** | `signalPerformance` · `symbolJudgment` · `coachDetail` 세 정책과 Swagger 두 곳. 코드 · 스펙에 `maxDrawdown` 0건 |
| FR-30 예외 2건째 | **pass** | 소비처 grep: BFF 3파일 · `@repo/core` 2 · 웹 3 — 전부 같은 커밋에서 바꿨다. 모바일 0건 |
| 계산식 불변 | **pass** | `MIN(return_rate)` · `Math.min(...)` 그대로. 기존 테스트 기대값 그대로 통과 |
| 게이트 | **pass** | `npm run build` · `npm test` **349 pass / 0 fail** · `eslint .` |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 응답 실측(서버 · BFF 경유) | 로컬 서버 · BFF 는 떠 있지만 이번 세션에서 로그인 토큰을 만들 수 없었다. 도메인 · 뷰모델 단위 테스트로만 확인 | 사용자가 로그인한 화면에서 코치 카드 확인 시 |
| 실제 MDD(시간순 자산 곡선) | 이번엔 이름만 바로잡았다. 판단 표본은 서로 겹치는 기간이라 한 곡선으로 이을 수 없다 | F009 슬라이스 1 `DecisionOutcome` — 사용자 거래로 곡선이 생길 때 |

## 11. F009 슬라이스 0 — C05 기간 통일 (2026-09-24, `feat/f009-slice0-reliability`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-56 한 표 | **pass** | `domain/policy/horizon.ts` `COACH_HORIZON` — `JUDGMENT_HORIZON_MS` · `modeDecision.timeframe` · `validity.code` · 템플릿 · Gemini 프롬프트가 전부 읽는다. `src` 에 "25분" · `5m-24h` · `1w-1y` 0건 |
| `SRV-REQ-024` FR-103 주입 | **pass** | LLM `timeframe` 을 버리고 표 값을 넣는다 — 테스트 "LLM 이 다른 기간을 써도 채점 기간으로 덮는다" |
| 채점 불변 | **pass** | 24시간 · 30일 그대로 — 기존 표본이 그대로 유효하다 |
| 게이트 | **pass** | `npm run build` · `npm test` **353 / 0**(+4 `horizon.test.ts`) · `eslint .` · `layer-check` 6파일 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 응답 · 화면 문구 실측 | 이번 세션에서 로그인 토큰을 만들 수 없었다 — 단위 · 뷰모델 테스트로만 확인 | 사용자 로그인 화면 QA |
| 25분 단타 전략 | 사용자 결정으로 만들지 않는다. 필요해지면 분봉 채점이 따로 있어야 한다 | 범위 밖(결정) |

## 12. F009 슬라이스 0 — C02 해설 캐시 키 (2026-09-24, `feat/f009-slice0-reliability`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-57 키 | **pass** | `explanationCacheKey(model, prompt)` — 테스트: 가격 200 · 1,000 · 1억 · 2억 → **키 4개**(옛 식은 넷 다 `200`), 근거 · 뉴스 요약 · 뉴스 출처 · 모드 · 모델이 바뀌면 다른 키, 같은 입력은 같은 키 |
| 캐시 상한 | **pass** | 만료 정리 + 500건 상한(옛 캐시는 지우지 않고 계속 커졌다) |
| 다른 캐시 | 없음 | `coach` 안 해설 캐시는 이 하나 |
| 게이트 | **pass** | `npm run build` · `npm test` **356 / 0**(+3) · `eslint .` · `layer-check` 3파일 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| LLM 호출 수 변화 실측 | 키가 정확해져 가격이 움직이면 새로 부른다. 해설은 사용자가 눌러야 부르고 사용자 ≤10명이라 예산 안으로 본다 — 실제 호출 수는 안 셌다 | 관측성 계측 |
| 서버 사실 스냅샷 기준 키 | 진단이 말한 `snapshotId + evidenceHash` 의 앞 절반은 스냅샷이 있어야 한다 | C01 |
