# SRV-REQ-025 (F004 API) — 검증 체크리스트

- REQ: `salt-server/requirements/specs/in-progress/SRV-REQ-025-F004-API.md`
- 브랜치: `feat/f004-symbol-judgment`(PR #48, `6f701b4`) → `feat/f004-zone-gauge`(PR #49, `ebadcf9`) · 검증일: 2026-09-21
- 작성: 2026-09-22 (backfill — 루트 체크리스트 두 개와 `src/coach` 코드에서 옮겼다. 새로 돌린 검증은 없다)
- 상태: **부분 완료** — 종목 경로 계약(FR-40~47) · **explain · preflight**(FR-11 · 12 · 14 · 20 · 50~52, 슬라이스 10) · **성적표 그룹**(FR-15 · 53, 2026-09-23 슬라이스 11)이 닫혔다. FR-48 미충족, 리포트 조립(FR-1~9) · 쿨다운(FR-10) · 프로필 영속화(FR-13) · FR-16~18 은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-symbol-judgment.md` · `F004-zone-gauge.md`

판정 정의는 `SRV-REQ-024.md` 체크리스트 머리와 같다.

## 1. 기존 경로 확장 · 신규 경로 (FR-1~20)

| FR | 내용 | 판정 | 비고 |
|---|---|---|---|
| FR-1~9 | 저장 추천 응답의 게이트 · `scoreNote` · `disclaimer` · `excluded[]` · `behaviorFacts` · `conditionCode` | 미착수 | 저장 추천 경로(`CoachDetailResult`)는 두 슬라이스 밖 |
| FR-10 | generate 쿨다운 429 | 미착수 | |
| FR-11~12 | explain 인증 · rate limit | **pass** (2026-09-22) | §6. 인증은 라우트 순서를 바꿔 `authMiddleware` 뒤로, 분당 10회는 유지 |
| FR-13 | profile 영속화 | 미착수 | 컬럼이 없다 — FR-48 과 같은 원인(`DB-REQ-017` FR-20) |
| FR-14 | preflight 차단 필드 금지 | **pass** (2026-09-22) | 추가 필드는 `stopLossRate` · `maxLossOfTotalRate` 뿐 |
| FR-15 | `signal-performance?groupBy=signalType` · 무인자 하위 호환 | **pass** (2026-09-23) | §7. 응답 모양이 다른 두 계약이라 쿼리로 갈랐다. `/api/coach/scoreboard` 가 같은 표 |
| FR-16~18 | `gapFromCurrent` · `factCode` · `staleHours` | 미착수 | 리포트 조립과 같은 슬라이스로 간다 |
| FR-19 | 금액 원 단위 정수 | **부분** | preflight `maxLossAmount` 만(2026-09-22). 다른 경로 미확인 |
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
| FR-48 | `mode` 없으면 `defaultMode` → `scalp` | **미충족** | `UserInvestmentProfile.defaultMode` 컬럼 없음 |
| FR-49 | `preview=true` 에서 `zone` · 게이지 생략 가능 | 범위 밖 | 슬라이스 2 가 뺐다. 지금은 `preview` 에서도 `zone` 을 싣는다(REQ Changelog — 생략은 허용일 뿐) |
| FR-50~52 | explain 미렌더 시 LLM 미호출 · `newsSummary` ≤ 5 · preflight `stopLossRate` / `maxLossOfTotalRate` | **pass** (2026-09-22) | §6 |
| FR-53 | 성적표 `returnDistribution` · `hits` · `misses` | **pass** (2026-09-23) | §7. 구간 6개 + 사분위수. **`horizonDays` 는 30 고정이 아니라 그룹의 관찰 기간**(단타 1 · 장기 30) — 아래 "다르게" |
| FR-54 | 관심 종목 응답에 판단 필드 없음 | 미착수 | 두 슬라이스가 watchlist 를 건드리지 않았다. 확인하지 않았다 |

## 4. 집계

| 판정 | FR 수 |
|---|---|
| pass | 19 (FR-30 종목 경로 · FR-40~47 · FR-11 · 12 · 14 · 15 · 20 · 32 · 50 · 51 · 52) |
| 다르게 | 1 (FR-53 — `returnDistribution.horizonDays` 를 그룹 기간으로) |
| 부분 | 1 (FR-19 — preflight 만) |
| 미충족 | 1 (FR-48) |
| 범위 밖 | 1 (FR-49) |
| 미착수 | 15 (FR-1~10 · FR-13 · FR-16~18 · FR-31 · FR-54) |

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
